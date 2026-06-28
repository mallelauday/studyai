"""
============================================================
StudyAI Backend — JWT Utilities
============================================================
Flask-native JWT helpers. All tokens are signed with the
application's own JWT_SECRET_KEY (HS256) — independent of
Firebase token lifecycle.

Token types
-----------
  access   short-lived (JWT_ACCESS_EXPIRES_MINUTES, default 15 min)
           carries uid, email, role, display_name
  refresh  long-lived  (JWT_REFRESH_EXPIRES_DAYS, default 7 days)
           carries only uid — minimises exposure

Errors
------
  TokenExpiredError   — token's exp claim is in the past
  InvalidTokenError   — signature bad, wrong type, or malformed
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from config import get_config
from utils.logger import get_logger

logger = get_logger(__name__)
Config = get_config()


# ── Custom exceptions ────────────────────────────────────

class TokenExpiredError(Exception):
    """Raised when the JWT exp claim is in the past."""


class InvalidTokenError(Exception):
    """Raised for any JWT that cannot be trusted."""


# ── Internal helpers ─────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _encode(payload: dict) -> str:
    """Sign *payload* and return a compact JWT string."""
    return jwt.encode(
        payload,
        Config.JWT_SECRET_KEY,
        algorithm=Config.JWT_ALGORITHM,
    )


def _decode(token: str) -> dict:
    """
    Verify *token* signature and expiry.

    Returns:
        Decoded payload dict.

    Raises:
        TokenExpiredError: if exp is in the past.
        InvalidTokenError: if signature is bad or token is malformed.
    """
    try:
        return jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=[Config.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("Token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError(f"Invalid token: {exc}") from exc


# ── Public API ───────────────────────────────────────────

def create_access_token(
    uid: str,
    email: str,
    role: str = "student",
    display_name: str = "",
) -> str:
    """
    Create a short-lived access token.

    Claims:
        sub   — Firebase UID
        email — user email
        role  — RBAC role (student, admin, …)
        name  — display name
        typ   — "access" (prevents use as refresh token)
        iat   — issued-at timestamp
        exp   — expiry timestamp
    """
    now = _now()
    expires = now + timedelta(minutes=Config.JWT_ACCESS_EXPIRES_MINUTES)
    payload = {
        "sub":   uid,
        "email": email,
        "role":  role,
        "name":  display_name,
        "typ":   "access",
        "iat":   int(now.timestamp()),
        "exp":   int(expires.timestamp()),
    }
    token = _encode(payload)
    logger.debug("Access token created for uid=%s exp=%s", uid, expires.isoformat())
    return token


def create_refresh_token(uid: str) -> str:
    """
    Create a long-lived refresh token.

    Claims:
        sub  — Firebase UID (only uid — minimal exposure)
        typ  — "refresh" (prevents use as access token)
        iat  — issued-at
        exp  — expiry
    """
    now = _now()
    expires = now + timedelta(days=Config.JWT_REFRESH_EXPIRES_DAYS)
    payload = {
        "sub": uid,
        "typ": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    token = _encode(payload)
    logger.debug("Refresh token created for uid=%s exp=%s", uid, expires.isoformat())
    return token


def decode_access_token(token: str) -> dict:
    """
    Decode and validate an access token.

    Returns:
        Payload dict with sub, email, role, name, exp, …

    Raises:
        TokenExpiredError: if expired.
        InvalidTokenError: if not an access token or signature bad.
    """
    payload = _decode(token)
    if payload.get("typ") != "access":
        raise InvalidTokenError("Token is not an access token.")
    return payload


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a refresh token.

    Returns:
        Payload dict with sub, exp, …

    Raises:
        TokenExpiredError: if expired.
        InvalidTokenError: if not a refresh token or signature bad.
    """
    payload = _decode(token)
    if payload.get("typ") != "refresh":
        raise InvalidTokenError("Token is not a refresh token.")
    return payload


def extract_bearer_token(request) -> str | None:
    """
    Extract the JWT from the Authorization header.

    Expects: ``Authorization: Bearer <token>``

    Returns the raw token string, or None if absent / malformed.
    """
    header = request.headers.get("Authorization", "")
    parts = header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_token_expiry_ms(token: str) -> int:
    """
    Return the token expiry as a Unix timestamp in **milliseconds**.
    Returns 0 on failure (safe default — treat as expired).
    Used by the frontend to schedule auto-logout.
    """
    try:
        payload = _decode(token)
        return int(payload.get("exp", 0)) * 1000
    except Exception:
        return 0
