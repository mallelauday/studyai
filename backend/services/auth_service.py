"""
============================================================
StudyAI Backend — Firebase Authentication Service
============================================================
Handles user registration, login (using Firebase REST API),
token verification, and token revocation.
"""

from __future__ import annotations

import requests
from firebase_admin import auth
from firebase_admin.exceptions import FirebaseError

from config import get_config
from utils.logger import get_logger
from utils.helpers import utc_now_iso
from utils.jwt_utils import create_access_token, create_refresh_token
from services.firebase_service import StorageRouter
from models.user import User

logger = get_logger(__name__)
Config = get_config()


class AuthServiceError(Exception):
    """Base exception for authentication errors."""
    pass


class InvalidTokenError(AuthServiceError):
    """Raised when a Firebase ID token is invalid or expired."""
    pass


class UserExistsError(AuthServiceError):
    """Raised when registering an email that already exists."""
    pass


class AuthenticationError(AuthServiceError):
    """Raised during failed login (invalid credentials)."""
    pass


# ── Register User ─────────────────────────────────────────

def register_user(email: str, password: str, display_name: str = "") -> User:
    """
    Create a new user account in Firebase Authentication and Firestore/Local.

    Args:
        email:        Valid email address.
        password:     User password (min 6 characters).
        display_name: Optional profile name.

    Returns:
        User model instance.

    Raises:
        UserExistsError: If user already exists.
        AuthServiceError: On any other Firebase error.
    """
    try:
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )

        user = User(
            uid=user_record.uid,
            email=user_record.email,
            display_name=user_record.display_name or display_name,
            role="student"
        )

        # Persist user profile to database (Firestore/Local fallback)
        StorageRouter("users").create(user.uid, user.to_dict())

        logger.info("User registered successfully: %s (%s)", user.uid, user.email)
        return user

    except auth.EmailAlreadyExistsError as exc:
        raise UserExistsError("An account with this email address already exists.") from exc
    except Exception as exc:
        logger.exception("User registration failed")
        raise AuthServiceError(f"Registration failed: {str(exc)}") from exc


# ── Login User (REST API) ─────────────────────────────────

def login_user(email: str, password: str) -> dict:
    """
    Authenticate user via Email/Password using Firebase Web Client API.

    Returns:
        Dict containing ``idToken``, ``refreshToken``, ``expiresIn``, and ``localId``.

    Raises:
        AuthenticationError: If email/password is incorrect.
        AuthServiceError:    If the Firebase Web API key is not configured or on network failure.
    """
    api_key = Config.FIREBASE_WEB_API_KEY
    if not api_key:
        logger.error("FIREBASE_WEB_API_KEY is not configured in .env.")
        raise AuthServiceError(
            "Login unavailable: Web API key not configured on backend."
        )

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()

        if response.status_code != 200:
            error_msg = data.get("error", {}).get("message", "INVALID_LOGIN_CREDENTIALS")
            logger.warning("Failed login attempt for %s: %s", email, error_msg)
            if error_msg in ("EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"):
                raise AuthenticationError("Invalid email or password.")
            raise AuthenticationError(f"Login failed: {error_msg}")

        # ── Pull identity fields from Firebase response ────
        uid          = data["localId"]
        user_email   = data["email"]
        display_name = data.get("displayName", "")

        # ── Resolve user role from local/Firestore store ──
        user_router = StorageRouter("users")
        user_doc    = user_router.get(uid)
        role        = (user_doc or {}).get("role", "student")

        # ── Update last_login_at ───────────────────────────
        now_iso = utc_now_iso()
        if user_doc:
            user_router.update(uid, {"last_login_at": now_iso})

        # ── Issue Flask-native JWT tokens ─────────────────
        access_token  = create_access_token(
            uid=uid,
            email=user_email,
            role=role,
            display_name=display_name,
        )
        refresh_token = create_refresh_token(uid=uid)

        logger.info("User logged in successfully: uid=%s role=%s", uid, role)
        return {
            "user": {
                "uid":          uid,
                "email":        user_email,
                "display_name": display_name,
                "role":         role,
            },
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "expires_in":    Config.JWT_ACCESS_EXPIRES_MINUTES * 60,
        }

    except requests.RequestException as exc:
        logger.error("Firebase REST API connection failed: %s", exc)
        raise AuthServiceError("Authentication service connection error.") from exc


# ── Verify ID Token ───────────────────────────────────────

def verify_token(id_token: str) -> dict:
    """
    Verify the validity of a Firebase ID token.

    Args:
        id_token: The client-side JWT token (ID Token).

    Returns:
        Decoded token payload dict.

    Raises:
        InvalidTokenError: If token is expired, revoked, or invalid.
    """
    try:
        # verify_id_token validates signature, expiration, and project match.
        # check_revoked=True checks if the token has been revoked (e.g. after logout/password reset)
        decoded_token = auth.verify_id_token(id_token, check_revoked=True)
        return decoded_token
    except auth.ExpiredIdTokenError as exc:
        raise InvalidTokenError("Firebase token has expired.") from exc
    except auth.RevokedIdTokenError as exc:
        raise InvalidTokenError("Firebase token has been revoked.") from exc
    except auth.InvalidIdTokenError as exc:
        raise InvalidTokenError("Invalid Firebase token.") from exc
    except FirebaseError as exc:
        logger.error("Firebase token verification error: %s", exc)
        raise InvalidTokenError("Could not verify token.") from exc


# ── Get User Profile ──────────────────────────────────────

def get_user_profile(uid: str) -> User:
    """
    Get user profile from database. Falls back to Firebase Auth if profile is missing.

    Raises:
        AuthServiceError: If user does not exist.
    """
    try:
        user_doc = StorageRouter("users").get(uid)
        if user_doc:
            return User.from_dict(user_doc)

        # Fallback to Firebase Auth
        user_record = auth.get_user(uid)
        user = User(
            uid=user_record.uid,
            email=user_record.email,
            display_name=user_record.display_name or ""
        )
        # Create record in db for future access
        StorageRouter("users").create(uid, user.to_dict())
        return user

    except auth.UserNotFoundError as exc:
        raise AuthServiceError("User profile not found.") from exc
    except Exception as exc:
        logger.error("Failed to retrieve profile for %s: %s", uid, exc)
        raise AuthServiceError("Profile retrieval failed.") from exc


# ── Logout (Revoke Tokens) ────────────────────────────────

def revoke_user_tokens(uid: str) -> None:
    """
    Revoke all active refresh tokens for the given user.

    Forces the user to re-authenticate on next API request.
    """
    try:
        auth.revoke_refresh_tokens(uid)
        logger.info("Tokens revoked for user: %s", uid)
    except Exception as exc:
        logger.error("Failed to revoke tokens for user %s: %s", uid, exc)
        raise AuthServiceError("Failed to sign out user session.") from exc


# ── Update User Profile ───────────────────────────────────

def update_user_profile(
    uid: str,
    display_name: str | None = None,
    email: str | None = None,
    avatar_url: str | None = None,
) -> User:
    """
    Update user profile in Firebase Auth and database.
    """
    update_data = {}
    fb_auth_update = {}

    if display_name is not None:
        update_data["display_name"] = display_name
        fb_auth_update["display_name"] = display_name
    if email is not None:
        update_data["email"] = email
        fb_auth_update["email"] = email
    if avatar_url is not None:
        update_data["avatar_url"] = avatar_url
        # avatar_url is not a standard Firebase Auth field (unless photo_url is used),
        # but we can set photo_url on Firebase Auth to align
        fb_auth_update["photo_url"] = avatar_url

    # Update in Firebase Auth (if active / possible)
    if fb_auth_update:
        try:
            auth.update_user(uid, **fb_auth_update)
            logger.info("Updated Firebase Auth details for uid=%s", uid)
        except Exception as exc:
            logger.warning("Could not update user in Firebase Auth: %s", exc)

    # Update in database (Firestore/local fallback)
    user_router = StorageRouter("users")
    existing_user_doc = user_router.get(uid)
    if not existing_user_doc:
        # Create empty profile first
        user_router.create(uid, {"uid": uid, "email": email or "", "display_name": display_name or "", "avatar_url": avatar_url or ""})
    else:
        user_router.update(uid, update_data)

    logger.info("Profile updated successfully in DB for user: %s", uid)
    return get_user_profile(uid)

