"""
============================================================
StudyAI Backend — Authentication Middleware
============================================================
Provides decorators to protect Flask routes using the
Flask-native JWT tokens issued by jwt_utils.

Decorators
----------
  @login_required  — verifies access token; sets g.user_id,
                     g.user_email, g.user_role, g.current_user
  @require_auth    — alias of @login_required
  @role_required   — extends @login_required to enforce RBAC
"""

from __future__ import annotations

from functools import wraps

from flask import request, g

from utils.jwt_utils import (
    decode_access_token,
    extract_bearer_token,
    TokenExpiredError,
    InvalidTokenError,
)
from utils.helpers import error_response
from utils.logger import get_logger

logger = get_logger(__name__)


# ── login_required ───────────────────────────────────────

def login_required(f):
    """
    Protect a Flask endpoint with JWT access-token verification.

    Expects:
        Authorization: Bearer <access_token>

    On success sets:
        g.user_id    — Firebase UID (str)
        g.user_email — user email (str)
        g.user_role  — RBAC role, e.g. "student" / "admin" (str)
        g.token_payload — full decoded JWT payload (dict)
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer_token(request)

        if not token:
            return error_response("Authorization token missing.", 401)

        try:
            payload = decode_access_token(token)
        except TokenExpiredError:
            return error_response("Access token has expired.", 401)
        except InvalidTokenError as exc:
            logger.warning("Invalid access token: %s", exc)
            return error_response("Invalid access token.", 401)
        except Exception as exc:
            logger.exception("Unexpected error in auth middleware: %s", exc)
            return error_response("Authentication error.", 500)

        # Populate Flask g context
        g.user_id      = payload["sub"]
        g.user_email   = payload.get("email", "")
        g.user_role    = payload.get("role", "student")
        g.token_payload = payload

        logger.debug(
            "Authenticated: uid=%s role=%s path=%s",
            g.user_id, g.user_role, request.path
        )
        return f(*args, **kwargs)

    return decorated


# ── require_auth — alias for backward compat ─────────────

def require_auth(f):
    """
    Alias of @login_required.
    Kept for backward compatibility with any existing routes
    that used the Firebase-based @require_auth decorator.
    Also populates request.user for any code that reads it.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer_token(request)

        if not token:
            return error_response("Authorization token missing.", 401)

        try:
            payload = decode_access_token(token)
        except TokenExpiredError:
            return error_response("Access token has expired.", 401)
        except InvalidTokenError as exc:
            logger.warning("Invalid access token (require_auth): %s", exc)
            return error_response("Invalid access token.", 401)
        except Exception as exc:
            logger.exception("Unexpected auth error: %s", exc)
            return error_response("Authentication error.", 500)

        uid  = payload["sub"]
        g.user_id      = uid
        g.user_email   = payload.get("email", "")
        g.user_role    = payload.get("role", "student")
        g.token_payload = payload

        # Populate request.user for any legacy code that reads it
        request.user = {
            "uid":          uid,
            "email":        g.user_email,
            "display_name": payload.get("name", ""),
            "role":         g.user_role,
        }

        logger.debug("require_auth: uid=%s path=%s", uid, request.path)
        return f(*args, **kwargs)

    return decorated


# ── role_required ────────────────────────────────────────

def role_required(*allowed_roles: str):
    """
    Decorator factory for RBAC route protection.

    Usage::

        @auth_bp.route("/admin/stats")
        @role_required("admin")
        def admin_stats():
            ...

        @auth_bp.route("/content")
        @role_required("admin", "moderator")
        def content():
            ...

    Applies @login_required first, then checks the role claim.
    Returns 403 (Forbidden) if the role is not in allowed_roles.
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated(*args, **kwargs):
            if g.user_role not in allowed_roles:
                logger.warning(
                    "RBAC denied: uid=%s role=%s path=%s allowed=%s",
                    g.user_id, g.user_role, request.path, allowed_roles
                )
                return error_response(
                    f"Access denied. Required role: {' or '.join(allowed_roles)}.",
                    403
                )
            return f(*args, **kwargs)
        return decorated
    return decorator
