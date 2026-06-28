"""
============================================================
StudyAI Backend — Central Configuration Module
============================================================
Loads all environment variables and exposes a typed Config
class used throughout the application.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Resolve project root and load .env ────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base configuration — values shared across all environments."""

    # ── Flask ──────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "studyai-fallback-secret")
    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    DEBUG: bool = os.getenv("FLASK_DEBUG", "True").lower() == "true"

    # ── Server ─────────────────────────────────────────────
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 5000))

    # ── Groq AI ────────────────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", 4096))
    GROQ_TEMPERATURE: float = float(os.getenv("GROQ_TEMPERATURE", 0.7))

    # ── Firebase ───────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_PRIVATE_KEY_ID: str = os.getenv("FIREBASE_PRIVATE_KEY_ID", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_CLIENT_ID: str = os.getenv("FIREBASE_CLIENT_ID", "")
    FIREBASE_AUTH_URI: str = os.getenv(
        "FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"
    )
    FIREBASE_TOKEN_URI: str = os.getenv(
        "FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"
    )
    FIREBASE_AUTH_PROVIDER_CERT_URL: str = os.getenv(
        "FIREBASE_AUTH_PROVIDER_X509_CERT_URL",
        "https://www.googleapis.com/oauth2/v1/certs",
    )
    FIREBASE_CLIENT_CERT_URL: str = os.getenv("FIREBASE_CLIENT_X509_CERT_URL", "")
    FIREBASE_WEB_API_KEY: str = os.getenv("FIREBASE_WEB_API_KEY", "")

    # ── File Upload ────────────────────────────────────────
    UPLOAD_FOLDER: Path = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH_MB: int = int(os.getenv("MAX_CONTENT_LENGTH_MB", 16))
    MAX_CONTENT_LENGTH: int = MAX_CONTENT_LENGTH_MB * 1024 * 1024  # Flask uses bytes
    ALLOWED_EXTENSIONS: set = set(
        os.getenv("ALLOWED_EXTENSIONS", "pdf,docx,txt,md").split(",")
    )

    # ── Local Storage ──────────────────────────────────────
    STORAGE_FOLDER: Path = BASE_DIR / os.getenv("STORAGE_FOLDER", "storage")
    USE_LOCAL_STORAGE: bool = os.getenv("USE_LOCAL_STORAGE", "True").lower() == "true"

    # ── Logging ────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    LOG_FOLDER: Path = BASE_DIR / os.getenv("LOG_FOLDER", "logs")

    # ── CORS ───────────────────────────────────────────────
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # ── JWT (Flask-native tokens) ──────────────────────────
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "studyai-jwt-fallback-secret-change-me"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRES_MINUTES: int = int(
        os.getenv("JWT_ACCESS_EXPIRES_MINUTES", 15)
    )
    JWT_REFRESH_EXPIRES_DAYS: int = int(
        os.getenv("JWT_REFRESH_EXPIRES_DAYS", 7)
    )

    # ── Firestore Collections ──────────────────────────────
    COLLECTIONS: dict = {
        "users": "users",
        "materials": "materials",
        "summaries": "summaries",
        "flashcards": "flashcards",
        "quizzes": "quizzes",
        "results": "results",
        "analytics": "analytics",
        "schedules": "schedules",
        "weak_topics": "weak_topics",
        "study_plans": "study_plans",
    }

    # ── App Version ────────────────────────────────────────
    APP_NAME: str = "StudyAI Backend"
    APP_VERSION: str = "1.0.0"

    @classmethod
    def is_firebase_configured(cls) -> bool:
        """Return True if all required Firebase credentials are present."""
        return all([
            cls.FIREBASE_PROJECT_ID,
            cls.FIREBASE_PRIVATE_KEY,
            cls.FIREBASE_CLIENT_EMAIL,
        ])

    @classmethod
    def is_groq_configured(cls) -> bool:
        """Return True if Groq API key is present."""
        return bool(cls.GROQ_API_KEY)

    @classmethod
    def ensure_directories(cls) -> None:
        """Create required directories if they do not exist."""
        for directory in [cls.UPLOAD_FOLDER, cls.STORAGE_FOLDER, cls.LOG_FOLDER]:
            directory.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    """Development-specific overrides."""
    DEBUG = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    """Production-specific overrides."""
    DEBUG = False
    LOG_LEVEL = "WARNING"


class TestingConfig(Config):
    """Test-specific overrides."""
    TESTING = True
    DEBUG = True
    USE_LOCAL_STORAGE = True


# ── Config selector ───────────────────────────────────────
_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config() -> type[Config]:
    """Return the appropriate Config class based on FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development").lower()
    return _CONFIG_MAP.get(env, DevelopmentConfig)
