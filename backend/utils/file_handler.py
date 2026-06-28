"""
============================================================
StudyAI Backend — File Handler Utility
============================================================
Handles secure saving, reading, and extraction of text
content from uploaded files (PDF, DOCX, TXT, MD).
"""

import os
import shutil
from pathlib import Path
from werkzeug.utils import secure_filename

# Optional imports — gracefully degrade if library missing
try:
    import PyPDF2
    _HAS_PYPDF2 = True
except ImportError:
    _HAS_PYPDF2 = False

try:
    from docx import Document as DocxDocument
    _HAS_DOCX = True
except ImportError:
    _HAS_DOCX = False

from utils.logger import get_logger
from utils.helpers import generate_uuid
from config import get_config

logger = get_logger(__name__)
Config = get_config()


# ── Save Uploaded File ────────────────────────────────────

def save_uploaded_file(file, user_id: str) -> dict:
    """
    Securely save a ``werkzeug.datastructures.FileStorage`` object.

    Args:
        file:    The uploaded file object from Flask's ``request.files``.
        user_id: Owner's user ID — used to namespace the upload directory.

    Returns:
        Dict with ``file_id``, ``filename``, ``original_name``,
        ``filepath``, ``size_bytes``, ``extension``.

    Raises:
        OSError: If the file cannot be written to disk.
    """
    original_name: str = file.filename
    safe_name: str = secure_filename(original_name)
    extension: str = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    file_id: str = generate_uuid()

    # Per-user upload directory to avoid filename collisions
    user_upload_dir: Path = Config.UPLOAD_FOLDER / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    # Store as <uuid>.<ext> to ensure uniqueness
    stored_name = f"{file_id}.{extension}"
    filepath: Path = user_upload_dir / stored_name

    file.save(filepath)
    size_bytes: int = filepath.stat().st_size

    logger.info("File saved: %s (%d bytes) for user %s", stored_name, size_bytes, user_id)

    return {
        "file_id": file_id,
        "filename": stored_name,
        "original_name": original_name,
        "filepath": str(filepath),
        "size_bytes": size_bytes,
        "extension": extension,
    }


# ── Text Extraction ───────────────────────────────────────

def extract_text(filepath: str) -> str:
    """
    Extract raw text from a file based on its extension.

    Supports: ``.pdf``, ``.docx``, ``.txt``, ``.md``.

    Args:
        filepath: Absolute or relative path to the file.

    Returns:
        Extracted text as a string (may be empty if extraction fails).
    """
    path = Path(filepath)
    ext = path.suffix.lower().lstrip(".")

    extractors = {
        "pdf": _extract_pdf,
        "docx": _extract_docx,
        "txt": _extract_plaintext,
        "md": _extract_plaintext,
    }

    extractor = extractors.get(ext)
    if extractor is None:
        logger.warning("No extractor for extension '%s'", ext)
        return ""

    try:
        text = extractor(path)
        logger.info("Extracted %d chars from %s", len(text), path.name)
        return text
    except Exception as exc:
        logger.error("Text extraction failed for %s: %s", filepath, exc)
        return ""


def _extract_pdf(path: Path) -> str:
    """Extract text from a PDF using PyPDF2."""
    if not _HAS_PYPDF2:
        raise ImportError("PyPDF2 is not installed. Run: pip install PyPDF2")

    pages: list[str] = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def _extract_docx(path: Path) -> str:
    """Extract text from a DOCX using python-docx."""
    if not _HAS_DOCX:
        raise ImportError("python-docx is not installed. Run: pip install python-docx")

    doc = DocxDocument(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extract_plaintext(path: Path) -> str:
    """Read a plain-text or markdown file."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


# ── File Management ───────────────────────────────────────

def delete_file(filepath: str) -> bool:
    """
    Delete a file from disk.

    Returns:
        ``True`` if deleted, ``False`` if not found or on error.
    """
    try:
        path = Path(filepath)
        if path.exists():
            path.unlink()
            logger.info("Deleted file: %s", filepath)
            return True
        logger.warning("File not found for deletion: %s", filepath)
        return False
    except OSError as exc:
        logger.error("Failed to delete %s: %s", filepath, exc)
        return False


def get_file_info(filepath: str) -> dict | None:
    """
    Return metadata for an existing file.

    Returns ``None`` if the file does not exist.
    """
    path = Path(filepath)
    if not path.exists():
        return None
    stat = path.stat()
    return {
        "filename": path.name,
        "filepath": str(path),
        "size_bytes": stat.st_size,
        "extension": path.suffix.lstrip(".").lower(),
        "modified_at": stat.st_mtime,
    }


def cleanup_user_uploads(user_id: str) -> bool:
    """Remove all uploaded files for a given user."""
    user_dir = Config.UPLOAD_FOLDER / user_id
    try:
        if user_dir.exists():
            shutil.rmtree(user_dir)
            logger.info("Cleaned up uploads for user: %s", user_id)
        return True
    except OSError as exc:
        logger.error("Failed to clean uploads for %s: %s", user_id, exc)
        return False
