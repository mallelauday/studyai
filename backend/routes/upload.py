"""
============================================================
StudyAI Backend — Upload Route
============================================================
POST /api/upload — Accept PDF/DOCX/TXT/MD files or raw text,
extract content, store in Firebase/local storage, and return
document metadata. Protected by authentication.
"""

from __future__ import annotations

from flask import Blueprint, request, g
from werkzeug.utils import secure_filename

from services.file_parser import parse_file, parse_raw_text
from services.firebase_service import StorageRouter
from models.study_material import StudyMaterial
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import validate_file_upload, validate_required_fields, sanitize_string
from utils.logger import get_logger
from config import get_config

logger = get_logger(__name__)
Config = get_config()

upload_bp = Blueprint("upload", __name__)


@upload_bp.post("/upload")
@login_required
def upload_document():
    """
    Upload a study document (file or raw text). Protected.

    Accepts:
        - Multipart file upload (PDF, DOCX, TXT, MD)
        - JSON body with ``raw_text`` and optional ``title``

    Returns:
        ``{ success, document_id, title, word_count, created_at }``
    """
    user_id = g.user_id

    # ── Branch A: Raw text ────────────────────────────────
    if request.is_json:
        return _handle_raw_text(user_id)

    # ── Branch B: File upload ─────────────────────────────
    return _handle_file_upload(user_id)


# ── GET /api/upload/<doc_id> — retrieve a document ───────

@upload_bp.get("/upload/<doc_id>")
@login_required
def get_document(doc_id: str):
    """
    Retrieve a stored document by ID. Protected.
    """
    router = StorageRouter("materials")
    doc = router.get(doc_id)
    if doc is None:
        return error_response(f"Document '{doc_id}' not found.", 404)

    # Prevent cross-user data leakage
    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this document.", 403)

    material = StudyMaterial.from_dict(doc)
    return success_response(
        data=material.to_response_dict(),
        message="Document retrieved successfully.",
    )


@upload_bp.get("/upload")
@login_required
def list_documents():
    """
    List all documents for the authenticated user. Protected.
    """
    user_id = g.user_id
    router = StorageRouter("materials")
    docs = router.filter_by_user(user_id)
    materials = [StudyMaterial.from_dict(d).to_response_dict() for d in docs]

    return success_response(
        data={"documents": materials, "count": len(materials)},
        message=f"Found {len(materials)} document(s).",
    )


@upload_bp.delete("/upload/<doc_id>")
@login_required
def delete_document(doc_id: str):
    """Delete a document by ID. Protected."""
    router = StorageRouter("materials")
    doc = router.get(doc_id)
    if doc is None:
        return error_response(f"Document '{doc_id}' not found.", 404)

    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to delete this document.", 403)

    deleted = router.delete(doc_id)
    if not deleted:
        return error_response("Failed to delete document.", 500)

    logger.info("Document deleted: %s", doc_id)
    return success_response(message="Document deleted successfully.")


# ── Private helpers ───────────────────────────────────────

def _handle_raw_text(user_id: str):
    """Process a raw text submission from a JSON body."""
    body = request.json or {}
    raw_text = sanitize_string(body.get("raw_text", ""))
    title = sanitize_string(body.get("title", "Untitled"))

    if not raw_text:
        return error_response("'raw_text' is required for text submissions.", 400)
    if len(raw_text) < 20:
        return error_response("'raw_text' is too short (minimum 20 characters).", 400)
    if len(raw_text) > 500_000:
        return error_response("'raw_text' exceeds the 500,000 character limit.", 413)

    parsed = parse_raw_text(raw_text, title=title or "Untitled")
    tags = [t.strip() for t in body.get("tags", "").split(",") if t.strip()]
    return _save_and_respond(parsed, user_id, tags, filepath="", size_bytes=len(raw_text.encode()))


def _handle_file_upload(user_id: str):
    """Process a multipart file upload."""
    if "file" not in request.files:
        return error_response("No file part in the request. Use field name 'file'.", 400)

    file = request.files["file"]

    # Validate the file
    is_valid, err = validate_file_upload(file)
    if not is_valid:
        return error_response(err, 400)

    # Generate a unique filename and save
    doc_id = generate_uuid()
    original_name = file.filename
    safe_name = secure_filename(original_name)
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    stored_filename = f"{doc_id}.{ext}"

    user_upload_dir = Config.UPLOAD_FOLDER / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = user_upload_dir / stored_filename

    try:
        file.save(filepath)
        size_bytes = filepath.stat().st_size
    except OSError as exc:
        logger.error("File save failed: %s", exc)
        return error_response("Failed to save file. Please try again.", 500)

    # Extract text
    try:
        parsed = parse_file(str(filepath))
    except (ValueError, FileNotFoundError) as exc:
        filepath.unlink(missing_ok=True)
        return error_response(f"File parsing failed: {exc}", 422)
    except Exception as exc:
        filepath.unlink(missing_ok=True)
        logger.exception("Unexpected parse error")
        return error_response(f"Unexpected error during file parsing: {exc}", 500)

    parsed["filename"] = stored_filename
    parsed["original_name"] = original_name
    parsed["filepath"] = str(filepath)
    parsed["size_bytes"] = size_bytes

    tags_raw = request.form.get("tags", "")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

    return _save_and_respond(parsed, user_id, tags, filepath=str(filepath), size_bytes=size_bytes, doc_id=doc_id)


def _save_and_respond(
    parsed: dict,
    user_id: str,
    tags: list[str],
    filepath: str,
    size_bytes: int,
    doc_id: str | None = None,
) -> tuple:
    """Build the StudyMaterial, save it, and return the API response."""
    doc_id = doc_id or generate_uuid()

    material = StudyMaterial(
        id=doc_id,
        user_id=user_id,
        title=parsed.get("title", "Untitled"),
        filename=parsed.get("filename", ""),
        original_name=parsed.get("original_name", ""),
        filepath=parsed.get("filepath", filepath),
        extension=parsed.get("extension", "txt"),
        content=parsed.get("text", ""),
        word_count=parsed.get("word_count", 0),
        char_count=parsed.get("char_count", 0),
        page_count=parsed.get("page_count", 1),
        size_bytes=size_bytes,
        tags=tags,
        status="processed",
    )

    router = StorageRouter("materials")
    saved = router.create(doc_id, material.to_dict())

    logger.info(
        "Document uploaded: %s | user: %s | words: %d",
        doc_id, user_id, material.word_count,
    )

    return success_response(
        data={
            "document_id": doc_id,
            "title": material.title,
            "word_count": material.word_count,
            "char_count": material.char_count,
            "page_count": material.page_count,
            "extension": material.extension,
            "size_bytes": size_bytes,
            "tags": tags,
            "preview": material.preview,
            "created_at": material.created_at,
        },
        message="Document uploaded and processed successfully.",
        status_code=201,
    )
