"""
============================================================
StudyAI Backend — Input Validators
============================================================
All validation helpers used across routes and services.
Returns (is_valid: bool, error_message: str | None).
"""

import re
import os
from pathlib import Path
from config import get_config

Config = get_config()


# ── File Validation ───────────────────────────────────────

def allowed_file(filename: str) -> bool:
    """Return True if the file extension is in the allowed set."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in Config.ALLOWED_EXTENSIONS


def validate_file_upload(file) -> tuple[bool, str | None]:
    """
    Validate a Flask file object before saving.

    Args:
        file: ``werkzeug.datastructures.FileStorage`` object.

    Returns:
        ``(True, None)`` on success; ``(False, error_message)`` on failure.
    """
    if file is None:
        return False, "No file provided."

    if file.filename == "" or file.filename is None:
        return False, "Filename is empty."

    if not allowed_file(file.filename):
        allowed = ", ".join(Config.ALLOWED_EXTENSIONS)
        return False, f"File type not allowed. Allowed types: {allowed}."

    # Check content length (file.seek/tell trick — works before save)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > Config.MAX_CONTENT_LENGTH:
        max_mb = Config.MAX_CONTENT_LENGTH_MB
        return False, f"File exceeds the maximum size of {max_mb} MB."

    if size == 0:
        return False, "File is empty."

    return True, None


# ── String / Field Validation ─────────────────────────────

def validate_required_fields(data: dict, fields: list[str]) -> tuple[bool, str | None]:
    """
    Ensure all required fields are present and non-empty in *data*.

    Returns:
        ``(True, None)`` or ``(False, 'Missing fields: ...')``.
    """
    missing = [f for f in fields if not data.get(f)]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}."
    return True, None


def validate_string_length(
    value: str,
    field_name: str,
    min_len: int = 1,
    max_len: int = 10_000,
) -> tuple[bool, str | None]:
    """Validate string length bounds."""
    if not isinstance(value, str):
        return False, f"'{field_name}' must be a string."
    length = len(value.strip())
    if length < min_len:
        return False, f"'{field_name}' must be at least {min_len} character(s)."
    if length > max_len:
        return False, f"'{field_name}' must not exceed {max_len} characters."
    return True, None


def validate_user_id(user_id: str) -> tuple[bool, str | None]:
    """Validate that *user_id* is a non-empty alphanumeric/dash string."""
    if not user_id or not isinstance(user_id, str):
        return False, "User ID is required."
    if not re.match(r"^[\w\-]{3,128}$", user_id):
        return False, "User ID contains invalid characters or is out of length bounds."
    return True, None


def validate_uuid(value: str, field_name: str = "ID") -> tuple[bool, str | None]:
    """Validate a standard UUID v4 string."""
    uuid_re = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )
    if not uuid_re.match(value or ""):
        return False, f"'{field_name}' is not a valid UUID."
    return True, None


def validate_difficulty(difficulty: str) -> tuple[bool, str | None]:
    """Ensure difficulty is one of the accepted values."""
    valid = {"easy", "medium", "hard"}
    if (difficulty or "").lower() not in valid:
        return False, f"'difficulty' must be one of: {', '.join(sorted(valid))}."
    return True, None


def validate_positive_int(
    value,
    field_name: str,
    min_val: int = 1,
    max_val: int = 100,
) -> tuple[bool, str | None]:
    """Validate an integer within [min_val, max_val]."""
    try:
        v = int(value)
    except (TypeError, ValueError):
        return False, f"'{field_name}' must be an integer."
    if not (min_val <= v <= max_val):
        return False, f"'{field_name}' must be between {min_val} and {max_val}."
    return True, None


def sanitize_string(value: str) -> str:
    """Strip leading/trailing whitespace and remove null bytes."""
    return (value or "").replace("\x00", "").strip()
