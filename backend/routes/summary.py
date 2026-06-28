"""
============================================================
StudyAI Backend — Summary Route
============================================================
POST /api/summary   — Generate AI summary for a document
GET  /api/summary   — List summaries for a user
GET  /api/summary/<id> — Retrieve a specific summary
"""

from __future__ import annotations

from flask import Blueprint, request, g

from services.groq_service import GroqService, GroqServiceError, GroqUnavailableError
from services.firebase_service import StorageRouter
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import validate_required_fields, sanitize_string
from utils.prompts import summary_prompt, SYSTEM_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)

summary_bp = Blueprint("summary", __name__)
_groq = GroqService()


@summary_bp.post("/summary")
@login_required
def generate_summary():
    """
    Generate an AI-powered summary for an uploaded document. Protected.

    Request JSON:
        ``document_id`` (required) — ID of an uploaded document
        ``force``       (optional) — bool, re-generate if summary exists

    Returns:
        ``{ success, summary: { title, topic_overview, key_concepts, ... } }``
    """
    body = request.get_json(silent=True) or {}

    # ── Validate input ────────────────────────────────────
    ok, err = validate_required_fields(body, ["document_id"])
    if not ok:
        return error_response(err, 400)

    document_id = sanitize_string(body["document_id"])
    user_id = g.user_id
    force_regenerate = bool(body.get("force", False))

    # ── Fetch the source document ─────────────────────────
    material_router = StorageRouter("materials")
    doc = material_router.get(document_id)
    if doc is None:
        return error_response(f"Document '{document_id}' not found.", 404)

    # Prevent cross-user data leakage
    if doc.get("user_id") != user_id:
        return error_response("Unauthorized to access this document.", 403)

    content = doc.get("content", "")
    title = doc.get("title", "Untitled")

    if not content or len(content.strip()) < 50:
        return error_response(
            "Document content is too short to summarise (minimum 50 characters).", 422
        )

    # ── Check for existing summary ────────────────────────
    summary_router = StorageRouter("summaries")
    if not force_regenerate:
        existing = summary_router.filter_by("document_id", document_id)
        if existing:
            logger.info("Returning cached summary for document: %s", document_id)
            return success_response(
                data={"summary": existing[0], "cached": True},
                message="Summary retrieved from cache.",
            )

    # ── Generate AI summary ───────────────────────────────
    try:
        prompt = summary_prompt(text=content, title=title)
        ai_result = _groq._chat(prompt, system_prompt=SYSTEM_PROMPT)
        summary_data = _groq._parse_json_response(ai_result)
    except GroqUnavailableError as exc:
        return error_response(str(exc), 503)
    except GroqServiceError as exc:
        logger.error("Groq summary generation failed: %s", exc)
        return error_response(f"AI service error: {exc}", 502)
    except Exception as exc:
        logger.exception("Unexpected error during summary generation")
        return error_response(f"Unexpected error: {exc}", 500)

    # ── Persist summary ───────────────────────────────────
    summary_id = generate_uuid()
    summary_doc = {
        "id": summary_id,
        "user_id": user_id,
        "document_id": document_id,
        "document_title": title,
        "summary": summary_data,
        **summary_data,   # flatten for easier querying
    }

    saved = summary_router.create(summary_id, summary_doc)

    # Update material status
    material_router.update(document_id, {"status": "summarised"})

    logger.info("Summary generated: %s for document: %s", summary_id, document_id)

    return success_response(
        data={
            "summary_id": summary_id,
            "document_id": document_id,
            "document_title": title,
            "summary": summary_data,
            "cached": False,
        },
        message="Summary generated successfully.",
        status_code=201,
    )


@summary_bp.get("/summary")
@login_required
def list_summaries():
    """
    List all summaries for the authenticated user. Protected.
    """
    user_id = g.user_id
    summaries = StorageRouter("summaries").filter_by_user(user_id)

    return success_response(
        data={"summaries": summaries, "count": len(summaries)},
        message=f"Found {len(summaries)} summary/summaries.",
    )


@summary_bp.get("/summary/<summary_id>")
@login_required
def get_summary(summary_id: str):
    """Retrieve a specific summary by ID. Protected."""
    summary = StorageRouter("summaries").get(summary_id)
    if summary is None:
        return error_response(f"Summary '{summary_id}' not found.", 404)

    if summary.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this summary.", 403)

    return success_response(
        data=summary,
        message="Summary retrieved successfully.",
    )


@summary_bp.delete("/summary/<summary_id>")
@login_required
def delete_summary(summary_id: str):
    """Delete a summary by ID. Protected."""
    router = StorageRouter("summaries")
    summary = router.get(summary_id)
    if summary is None:
        return error_response(f"Summary '{summary_id}' not found.", 404)

    if summary.get("user_id") != g.user_id:
        return error_response("Unauthorized to delete this summary.", 403)

    router.delete(summary_id)
    return success_response(message="Summary deleted.")
