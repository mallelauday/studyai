"""
============================================================
StudyAI Backend — Firebase Configuration & Firestore Client
============================================================
Initialises Firebase Admin SDK using serviceAccountKey.json
and provides Firestore client.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore

from utils.logger import get_logger

logger = get_logger(__name__)

# ── Module-level singletons ───────────────────────────────
_firebase_app = None
_firestore_client = None
_firebase_available = False


def init_firebase():
    """
    Initialise Firebase using serviceAccountKey.json
    """

    global _firebase_app, _firestore_client, _firebase_available

    try:
        # Get backend folder path
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Path to JSON key
        key_path = os.path.join(base_dir, "serviceAccountKey.json")

        # Check file exists
        if not os.path.exists(key_path):
            # Try to build from environment variables
            from config import get_config
            Config = get_config()
            if Config.is_firebase_configured():
                logger.info("Initializing Firebase using environment variables...")
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": Config.FIREBASE_PROJECT_ID,
                    "private_key_id": Config.FIREBASE_PRIVATE_KEY_ID,
                    "private_key": Config.FIREBASE_PRIVATE_KEY,
                    "client_email": Config.FIREBASE_CLIENT_EMAIL,
                    "client_id": Config.FIREBASE_CLIENT_ID,
                    "auth_uri": Config.FIREBASE_AUTH_URI,
                    "token_uri": Config.FIREBASE_TOKEN_URI,
                    "auth_provider_x509_cert_url": Config.FIREBASE_AUTH_PROVIDER_CERT_URL,
                    "client_x509_cert_url": Config.FIREBASE_CLIENT_CERT_URL,
                })
            else:
                logger.error("❌ Firebase key not found at: %s and environment variables are incomplete", key_path)
                _firebase_available = False
                return
        else:
            # Load credentials
            cred = credentials.Certificate(key_path)

        # Initialize Firebase only once
        if not firebase_admin._apps:
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            _firebase_app = firebase_admin.get_app()

        # Firestore client
        _firestore_client = firestore.client()
        _firebase_available = True

        logger.info("🔥 Firebase initialized successfully — Firestore ACTIVE")

    except Exception as exc:
        _firebase_available = False
        logger.error("❌ Firebase initialization failed: %s", exc)


# ── Firestore Access ───────────────────────────────────────

def get_firestore():
    """Return Firestore client or None"""
    return _firestore_client


def is_firebase_available() -> bool:
    """Check if Firebase is active"""
    return _firebase_available


# ── Connection Test ────────────────────────────────────────

def validate_connection() -> dict:
    """
    Lightweight test to check Firestore connection
    """

    if not _firebase_available or _firestore_client is None:
        return {"connected": False, "error": "Firebase not initialized"}

    try:
        list(_firestore_client.collections())
        return {"connected": True}
    except Exception as exc:
        return {"connected": False, "error": str(exc)}


# ── Collection Helper ───────────────────────────────────────

def get_collection(name: str):
    """
    Get Firestore collection safely
    """

    if not _firebase_available or _firestore_client is None:
        return None

    return _firestore_client.collection(name)


# ── Collection Info ─────────────────────────────────────────

def ensure_collections() -> None:
    """
    Firestore auto-creates collections, so this is only logging
    """

    if not _firebase_available:
        return

    logger.info("📦 Firestore is ready (collections will auto-create)")