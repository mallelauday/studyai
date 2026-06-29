"""
============================================================
StudyAI Backend — Flask Application Entry Point (FIXED)
============================================================
"""

import os
from flask import Flask, request
from flask_cors import CORS

from config import get_config
from utils.logger import get_logger
from utils.helpers import error_response
from firebase.firebase_config import init_firebase, ensure_collections
from services.local_storage import init_local_storage

# ── Bootstrap ─────────────────────────────────────────────
Config = get_config()
Config.ensure_directories()

logger = get_logger("studyai.app")


# ── Application Factory ───────────────────────────────────
def create_app() -> Flask:
    app = Flask(__name__)

    # ── Flask config ──────────────────────────────────────
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["DEBUG"] = Config.DEBUG
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    app.config["UPLOAD_FOLDER"] = str(Config.UPLOAD_FOLDER)

    # ──────────────────────────────────────────────────────
    # FIX 1: SAFE CORS CONFIG (frontend compatible)
    # ──────────────────────────────────────────────────────
    cors_origins = getattr(Config, "CORS_ORIGINS", None)

    if not cors_origins:
        cors_origins = [
            "https://studyai-navy.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]

    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        supports_credentials=True,
    )

    logger.info("CORS enabled for: %s", cors_origins)

    # ── Firebase ──────────────────────────────────────────
    try:
        init_firebase()
        ensure_collections()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error("Firebase init failed: %s", str(e))

    # ── Local Storage ─────────────────────────────────────
    try:
        init_local_storage()
        logger.info("Local storage initialized")
    except Exception as e:
        logger.error("Local storage init failed: %s", str(e))

    # ── Blueprints ────────────────────────────────────────
    _register_blueprints(app)

    # ── Error handlers ────────────────────────────────────
    _register_error_handlers(app)

    # ── Logging hooks ─────────────────────────────────────
    _register_request_hooks(app)

    logger.info(
        "🚀 %s v%s running — env: %s | %s:%s",
        Config.APP_NAME,
        Config.APP_VERSION,
        Config.FLASK_ENV,
        Config.HOST,
        Config.PORT,
    )

    return app


# ── Blueprints ───────────────────────────────────────────
def _register_blueprints(app: Flask) -> None:
    from routes.health import health_bp
    from routes.auth import auth_bp
    from routes.upload import upload_bp
    from routes.summary import summary_bp
    from routes.flashcards import flashcards_bp
    from routes.quiz import quiz_bp
    from routes.schedule import schedule_bp
    from routes.analytics import analytics_bp
    from routes.export import export_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(summary_bp, url_prefix="/api")
    app.register_blueprint(flashcards_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")
    app.register_blueprint(schedule_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(export_bp, url_prefix="/api")

    logger.info("Blueprints registered successfully")

    logger.info("Registered Routes:")
    for rule in app.url_map.iter_rules():
        logger.info(
            "Route: %s [%s] -> %s",
            rule.rule,
            ",".join(rule.methods),
            rule.endpoint,
        )


# ── Error Handlers (SAFE JSON RESPONSES) ────────────────
def _register_error_handlers(app: Flask) -> None:

    @app.errorhandler(400)
    def bad_request(e):
        return error_response("Bad request", 400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response("Unauthorized", 401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response("Forbidden", 403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response(f"Route not found: {request.path}", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response("Method not allowed", 405)

    @app.errorhandler(413)
    def too_large(e):
        return error_response("File too large", 413)

    @app.errorhandler(429)
    def too_many(e):
        return error_response("Too many requests", 429)

    # ── FIX 2: Prevent 500 crashes leaking to frontend ──
    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Server error at %s", request.path)
        return error_response("Internal server error", 500)


# ── Request logging ──────────────────────────────────────
def _register_request_hooks(app: Flask) -> None:

    @app.before_request
    def log_request():
        print(request.method, request.path)
        logger.debug("→ %s %s", request.method, request.path)

    @app.after_request
    def log_response(response):
        logger.debug("← %s %s → %s", request.method, request.path, response.status_code)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response


# ── Run App ──────────────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )