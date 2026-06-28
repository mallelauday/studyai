"""
============================================================
StudyAI Backend — Flashcards Route
============================================================
POST /api/flashcards          — Generate flashcards for a document
GET  /api/flashcards          — List flashcard sets for a user
GET  /api/flashcards/<id>     — Get a specific flashcard set
PATCH /api/flashcards/<id>/master — Mark a card as mastered
DELETE /api/flashcards/<id>   — Delete a flashcard set
"""

from __future__ import annotations

from flask import Blueprint, request, g

from services.groq_service import GroqService, GroqServiceError, GroqUnavailableError
from services.firebase_service import StorageRouter
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import (
    validate_required_fields, validate_positive_int,
    validate_difficulty, sanitize_string,
)
from utils.prompts import flashcards_prompt, SYSTEM_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)

flashcards_bp = Blueprint("flashcards", __name__)
_groq = GroqService()


@flashcards_bp.post("/flashcards")
@login_required
def generate_flashcards():
    """
    Generate AI flashcards for an uploaded document. Protected.

    Request JSON:
        ``document_id``  (required) — source document ID
        ``count``        (optional) — number of flashcards, default 20, max 50
        ``difficulty``   (optional) — "easy" | "medium" | "hard" | "mixed" (default mixed)
        ``force``        (optional) — bool, re-generate even if set exists

    Returns:
        ``{ success, flashcard_set_id, count, cards: [...] }``
    """
    body = request.get_json(silent=True) or {}

    ok, err = validate_required_fields(body, ["document_id"])
    if not ok:
        return error_response(err, 400)

    document_id = sanitize_string(body["document_id"])
    user_id = g.user_id
    count = int(body.get("count", 20))
    force = bool(body.get("force", False))

    # Validate count
    ok, err = validate_positive_int(count, "count", min_val=1, max_val=50)
    if not ok:
        return error_response(err, 400)

    # ── Fetch source document ─────────────────────────────
    doc = StorageRouter("materials").get(document_id)
    if doc is None:
        return error_response(f"Document '{document_id}' not found.", 404)

    if doc.get("user_id") != user_id:
        return error_response("Unauthorized to access this document.", 403)

    content = doc.get("content", "")
    title = doc.get("title", "Untitled")

    if not content or len(content.strip()) < 50:
        return error_response("Document content is too short to generate flashcards.", 422)

    # ── Return cached set if available ────────────────────
    fc_router = StorageRouter("flashcards")
    if not force:
        existing = fc_router.filter_by("document_id", document_id)
        if existing:
            logger.info("Returning cached flashcards for document: %s", document_id)
            set_doc = existing[0]
            return success_response(
                data={
                    "flashcard_set_id": set_doc["id"],
                    "document_id": document_id,
                    "document_title": title,
                    "count": len(set_doc.get("cards", [])),
                    "cards": set_doc.get("cards", []),
                    "cached": True,
                },
                message="Flashcards retrieved from cache.",
            )

    # ── Generate AI flashcards ────────────────────────────
    try:
        prompt = flashcards_prompt(text=content, count=count, title=title)
        raw = _groq._chat(prompt, system_prompt=SYSTEM_PROMPT)
        cards = _groq._parse_json_response(raw)
        if not isinstance(cards, list):
            cards = cards.get("flashcards", [])
    except GroqUnavailableError as exc:
        return error_response(str(exc), 503)
    except GroqServiceError as exc:
        return error_response(f"AI service error: {exc}", 502)
    except Exception as exc:
        logger.exception("Unexpected flashcard generation error")
        return error_response(f"Unexpected error: {exc}", 500)

    # Assign sequential IDs if missing
    for i, card in enumerate(cards):
        if "id" not in card:
            card["id"] = i + 1
        card.setdefault("mastered", False)

    # ── Persist ───────────────────────────────────────────
    set_id = generate_uuid()
    set_doc = {
        "id": set_id,
        "user_id": user_id,
        "document_id": document_id,
        "document_title": title,
        "cards": cards,
        "mastered_count": 0,
        "total_cards": len(cards),
    }
    fc_router.create(set_id, set_doc)

    logger.info(
        "Flashcards generated: %d cards for document %s", len(cards), document_id
    )

    return success_response(
        data={
            "flashcard_set_id": set_id,
            "document_id": document_id,
            "document_title": title,
            "count": len(cards),
            "cards": cards,
            "cached": False,
        },
        message=f"{len(cards)} flashcards generated successfully.",
        status_code=201,
    )


@flashcards_bp.get("/flashcards")
@login_required
def list_flashcard_sets():
    """
    List all flashcard sets for the authenticated user. Protected.
    """
    user_id = g.user_id
    sets = StorageRouter("flashcards").filter_by_user(user_id)

    # Return lightweight list (no card content)
    lightweight = [
        {
            "flashcard_set_id": s["id"],
            "document_id": s.get("document_id"),
            "document_title": s.get("document_title"),
            "total_cards": s.get("total_cards", len(s.get("cards", []))),
            "mastered_count": s.get("mastered_count", 0),
            "created_at": s.get("created_at"),
        }
        for s in sets
    ]

    return success_response(
        data={"flashcard_sets": lightweight, "count": len(lightweight)},
        message=f"Found {len(lightweight)} flashcard set(s).",
    )


@flashcards_bp.get("/flashcards/<set_id>")
@login_required
def get_flashcard_set(set_id: str):
    """Retrieve a specific flashcard set with all cards. Protected."""
    doc = StorageRouter("flashcards").get(set_id)
    if doc is None:
        return error_response(f"Flashcard set '{set_id}' not found.", 404)

    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this flashcard set.", 403)

    return success_response(
        data=doc,
        message="Flashcard set retrieved successfully.",
    )


@flashcards_bp.patch("/flashcards/<set_id>/master")
@login_required
def update_mastered(set_id: str):
    """
    Mark one or more flashcards as mastered or unmastered. Protected.
    """
    body = request.get_json(silent=True) or {}
    card_ids = body.get("card_ids", [])
    mastered = bool(body.get("mastered", True))

    if not card_ids:
        return error_response("'card_ids' list is required.", 400)

    router = StorageRouter("flashcards")
    set_doc = router.get(set_id)
    if set_doc is None:
        return error_response(f"Flashcard set '{set_id}' not found.", 404)

    if set_doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to modify this flashcard set.", 403)

    cards = set_doc.get("cards", [])
    card_id_set = {str(cid) for cid in card_ids}
    updated_count = 0

    for card in cards:
        if str(card.get("id")) in card_id_set:
            card["mastered"] = mastered
            updated_count += 1

    mastered_total = sum(1 for c in cards if c.get("mastered"))
    router.update(set_id, {"cards": cards, "mastered_count": mastered_total})

    return success_response(
        data={
            "updated_cards": updated_count,
            "mastered_count": mastered_total,
            "total_cards": len(cards),
        },
        message=f"{updated_count} card(s) updated.",
    )


@flashcards_bp.delete("/flashcards/<set_id>")
@login_required
def delete_flashcard_set(set_id: str):
    """Delete a flashcard set by ID. Protected."""
    router = StorageRouter("flashcards")
    doc = router.get(set_id)
    if doc is None:
        return error_response(f"Flashcard set '{set_id}' not found.", 404)

    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to delete this flashcard set.", 403)

    router.delete(set_id)
    return success_response(message="Flashcard set deleted.")
