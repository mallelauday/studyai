"""
============================================================
StudyAI Backend — General Helpers
============================================================
Utility functions for response formatting, UUID generation,
timestamp handling, and data transformation.
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Any
from flask import jsonify


# ── UUID ──────────────────────────────────────────────────

def generate_uuid() -> str:
    """Return a new UUID v4 string."""
    return str(uuid.uuid4())


# ── Timestamps ────────────────────────────────────────────

def utc_now() -> datetime:
    """Return current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Return current UTC time as an ISO-8601 string."""
    return utc_now().isoformat()


def parse_iso(ts: str) -> datetime | None:
    """
    Parse an ISO-8601 string to a datetime.

    Returns ``None`` if the string cannot be parsed.
    """
    try:
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


# ── API Response Formatting ───────────────────────────────

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
):
    """Build a standardised JSON success response."""
    payload = {
        "success": True,
        "message": message,
        "timestamp": utc_now_iso(),
    }
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    details: Any = None,
):
    """Build a standardised JSON error response."""
    payload = {
        "success": False,
        "error": message,
        "timestamp": utc_now_iso(),
    }
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status_code


def paginate_list(items: list, page: int = 1, per_page: int = 20) -> dict:
    """
    Slice *items* into a paginated response dict.

    Args:
        items:    Full list of items.
        page:     1-indexed page number.
        per_page: Items per page.

    Returns:
        Dict with keys ``items``, ``page``, ``per_page``,
        ``total``, ``total_pages``, ``has_next``, ``has_prev``.
    """
    total = len(items)
    total_pages = max(1, -(-total // per_page))  # ceiling division
    page = max(1, min(page, total_pages))
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "items": items[start:end],
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


# ── Data Transformation ───────────────────────────────────

def safe_json_loads(raw: str, default: Any = None) -> Any:
    """Attempt JSON parse; return *default* on failure."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def flatten_dict(d: dict, parent_key: str = "", sep: str = ".") -> dict:
    """Recursively flatten a nested dict with dot-separated keys."""
    items: list = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def truncate_text(text: str, max_chars: int = 500, suffix: str = "...") -> str:
    """Truncate *text* to *max_chars* and append *suffix* if truncated."""
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars - len(suffix)] + suffix


def clean_dict(d: dict) -> dict:
    """Remove keys whose value is None from *d* (shallow)."""
    return {k: v for k, v in d.items() if v is not None}
