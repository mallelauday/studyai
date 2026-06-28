"""
============================================================
StudyAI Backend — Authentication Routes
============================================================
Provides registration, login, token refresh, profile, and
logout endpoints.

Token contract (all responses use standard envelope):
  SUCCESS  { "success": true,  "data": { ... } }
  ERROR    { "success": false, "error": "..." }

Login response shape (data):
  {
    "user":          { uid, email, display_name, role },
    "access_token":  "<15-min JWT>",
    "refresh_token": "<7-day JWT>",
    "expires_in":    900   // seconds
  }
"""

from flask import Blueprint, request, g

from services.auth_service import (
    register_user,
    login_user,
    get_user_profile,
    revoke_user_tokens,
    UserExistsError,
    AuthenticationError,
    AuthServiceError,
)
from middleware.auth_middleware import login_required
from utils.helpers import success_response, error_response
from utils.validators import validate_required_fields, sanitize_string
from utils.logger import get_logger
from utils.jwt_utils import (
    decode_refresh_token,
    create_access_token,
    TokenExpiredError,
    InvalidTokenError,
)
from services.firebase_service import StorageRouter

logger = get_logger(__name__)
auth_bp = Blueprint("auth", __name__)


# ============================================================
# POST /api/auth/register
# ============================================================

@auth_bp.route("/auth/register", methods=["POST"])
def register():
    """
    Register a new user.

    Request body:
        { "email": "...", "password": "...", "display_name": "..." }
    """
    logger.info("REGISTER route hit")

    body = request.get_json(silent=True)
    if not body:
        return error_response("Request body must be valid JSON.", 400)

    ok, err = validate_required_fields(body, ["email", "password"])
    if not ok:
        return error_response(err, 400)

    email        = sanitize_string(body["email"])
    password     = body["password"]
    display_name = sanitize_string(body.get("display_name", ""))

    if len(password) < 6:
        return error_response("Password must be at least 6 characters.", 400)

    try:
        user = register_user(
            email=email,
            password=password,
            display_name=display_name,
        )
        return success_response(
            data={"user": user.to_dict()},
            message="User registered successfully.",
            status_code=201,
        )

    except UserExistsError as e:
        return error_response(str(e), 409)
    except AuthServiceError as e:
        return error_response(str(e), 400)
    except Exception:
        logger.exception("Registration failed")
        return error_response("Registration failed. Please try again.", 500)


# ============================================================
# POST /api/auth/login
# ============================================================

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """
    Authenticate user and issue Flask JWT access + refresh tokens.

    Request body:
        { "email": "...", "password": "..." }

    Response data:
        {
          "user":          { uid, email, display_name, role },
          "access_token":  "<JWT>",
          "refresh_token": "<JWT>",
          "expires_in":    900
        }
    """
    logger.info("LOGIN route hit")

    body = request.get_json(silent=True)
    if not body:
        return error_response("Request body must be valid JSON.", 400)

    ok, err = validate_required_fields(body, ["email", "password"])
    if not ok:
        return error_response(err, 400)

    email    = sanitize_string(body["email"])
    password = body["password"]

    try:
        result = login_user(email=email, password=password)
        # result shape: { user, access_token, refresh_token, expires_in }
        return success_response(data=result, message="Login successful.")

    except AuthenticationError as e:
        return error_response(str(e), 401)
    except AuthServiceError as e:
        return error_response(str(e), 500)
    except Exception:
        logger.exception("Login failed")
        return error_response("Login failed. Please try again.", 500)


# ============================================================
# POST /api/auth/refresh
# ============================================================

@auth_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    """
    Issue a new access token using a valid refresh token.

    Request body:
        { "refresh_token": "<7-day JWT>" }

    Response data:
        {
          "access_token": "<new 15-min JWT>",
          "expires_in":   900
        }
    """
    logger.info("REFRESH route hit")

    body = request.get_json(silent=True)
    if not body:
        return error_response("Request body must be valid JSON.", 400)

    refresh_token = (body.get("refresh_token") or "").strip()
    if not refresh_token:
        return error_response("refresh_token is required.", 400)

    try:
        payload = decode_refresh_token(refresh_token)
    except TokenExpiredError:
        return error_response("Refresh token has expired. Please log in again.", 401)
    except InvalidTokenError as e:
        logger.warning("Invalid refresh token: %s", e)
        return error_response("Invalid refresh token.", 401)

    uid = payload["sub"]

    # Reload user profile to pick up any role changes
    user_router = StorageRouter("users")
    user_doc    = user_router.get(uid)
    role         = (user_doc or {}).get("role", "student")
    email        = (user_doc or {}).get("email", "")
    display_name = (user_doc or {}).get("display_name", "")

    from config import get_config
    Config = get_config()

    new_access_token = create_access_token(
        uid=uid,
        email=email,
        role=role,
        display_name=display_name,
    )

    logger.info("Access token refreshed for uid=%s", uid)
    return success_response(
        data={
            "access_token": new_access_token,
            "expires_in":   Config.JWT_ACCESS_EXPIRES_MINUTES * 60,
        },
        message="Token refreshed.",
    )


# ============================================================
# GET /api/auth/me
# ============================================================

@auth_bp.route("/auth/me", methods=["GET"])
@login_required
def me():
    """
    Return the currently authenticated user profile.
    Requires: Authorization: Bearer <access_token>
    """
    logger.debug("ME route hit: uid=%s", g.user_id)

    try:
        profile = get_user_profile(g.user_id)
        return success_response(
            data={"user": profile.to_dict()},
            message="Profile retrieved.",
        )
    except Exception:
        logger.exception("Profile retrieval failed")
        return error_response("Could not retrieve profile.", 500)


# ============================================================
# GET /api/profile  (legacy alias)
# ============================================================

@auth_bp.route("/profile", methods=["GET"])
@login_required
def profile():
    """
    Legacy profile endpoint.
    Returns the decoded JWT payload as the user object.
    """
    return success_response(
        data={
            "user": {
                "uid":          g.user_id,
                "email":        g.user_email,
                "role":         g.user_role,
                "display_name": g.token_payload.get("name", ""),
            }
        }
    )


# ============================================================
# POST /api/auth/logout
# ============================================================

@auth_bp.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    """
    Logout the current user.

    For stateless JWTs this is a best-effort server-side revocation
    (revokes Firebase refresh tokens so re-login from other clients
    fails). The client MUST delete its stored tokens.
    """
    logger.info("LOGOUT route hit: uid=%s", g.user_id)

    try:
        revoke_user_tokens(g.user_id)
        return success_response(message="Logged out successfully.")
    except AuthServiceError as e:
        return error_response(str(e), 500)
    except Exception:
        logger.exception("Logout failed")
        return error_response("Logout failed.", 500)


# ============================================================
# PUT /api/user/profile
# ============================================================

@auth_bp.route("/user/profile", methods=["PUT"])
@login_required
def update_profile():
    """
    Update the current user's profile.
    Request body:
        { "display_name": "...", "email": "...", "avatar_url": "..." }
    """
    logger.info("UPDATE PROFILE route hit: uid=%s", g.user_id)
    from flask import jsonify

    body = request.get_json(silent=True) or {}

    display_name = body.get("display_name")
    email = body.get("email")
    avatar_url = body.get("avatar_url")

    if display_name is not None:
        display_name = sanitize_string(display_name)
    if email is not None:
        email = sanitize_string(email)
    if avatar_url is not None:
        avatar_url = sanitize_string(avatar_url)

    try:
        from services.auth_service import update_user_profile
        updated_user = update_user_profile(
            g.user_id,
            display_name=display_name,
            email=email,
            avatar_url=avatar_url,
        )

        user_dict = {
            "uid": updated_user.uid,
            "display_name": updated_user.display_name,
            "email": updated_user.email,
            "avatar_url": getattr(updated_user, "avatar_url", ""),
        }

        logger.info("Profile update success for user %s", g.user_id)
        return jsonify({
            "success": True,
            "user": user_dict,
            "data": {
                "user": user_dict
            },
            "error": None
        })

    except Exception as e:
        logger.exception("Profile update failed for user %s", g.user_id)
        return jsonify({
            "success": False,
            "data": None,
            "error": f"Failed to update profile: {str(e)}"
        }), 500

