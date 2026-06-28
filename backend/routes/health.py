"""
============================================================
StudyAI Backend — Health & Version Routes
============================================================
Provides:
    GET  /api/health    — Liveness probe with service status
    GET  /api/version   — App metadata
"""

from flask import Blueprint
from firebase.firebase_config import validate_connection as firebase_status, is_firebase_available
from services.groq_service import GroqService
from services.local_storage import LocalStorage
from utils.helpers import success_response, utc_now_iso
from utils.logger import get_logger
from config import get_config

logger = get_logger(__name__)
Config = get_config()

health_bp = Blueprint("health", __name__)

# Singleton Groq service (no API calls until validate_connection() is called)
_groq = GroqService()


@health_bp.get("/health")
def health_check():
    """
    Liveness and readiness probe.

    Checks Firebase, Groq, and local storage availability.
    Returns HTTP 200 always so that load-balancers can reach the process;
    individual service status is reported in the JSON body.
    """
    # ── Firebase status ────────────────────────────────────
    fb_result = firebase_status()
    firebase_info = {
        "available": is_firebase_available(),
        "connected": fb_result.get("connected", False),
        "error": fb_result.get("error"),
    }

    # ── Local storage status ───────────────────────────────
    try:
        _store = LocalStorage("materials")
        local_storage_info = {
            "available": True,
            "path": str(Config.STORAGE_FOLDER),
            "doc_count": _store.count(),
        }
    except Exception as exc:
        local_storage_info = {"available": False, "error": str(exc)}

    # ── Groq status (lightweight — skip full validation on every call) ─
    groq_info = {
        "configured": Config.is_groq_configured(),
        "model": Config.GROQ_MODEL,
    }

    # ── Overall health ─────────────────────────────────────
    # App is healthy as long as it can serve requests (storage is available)
    is_healthy = local_storage_info.get("available", False) or firebase_info.get("connected", False)

    data = {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": utc_now_iso(),
        "services": {
            "firebase": firebase_info,
            "groq": groq_info,
            "local_storage": local_storage_info,
        },
        "config": {
            "env": Config.FLASK_ENV,
            "use_local_storage": Config.USE_LOCAL_STORAGE,
        },
    }

    logger.info("Health check: %s", data["status"])
    return success_response(data=data, message="Health check complete")


@health_bp.get("/version")
def version():
    """Return application version and metadata."""
    return success_response(
        data={
            "name": Config.APP_NAME,
            "version": Config.APP_VERSION,
            "environment": Config.FLASK_ENV,
            "python_backend": "Flask 3.0",
            "ai_model": Config.GROQ_MODEL,
            "timestamp": utc_now_iso(),
        },
        message="StudyAI API is running",
    )
