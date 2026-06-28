"""
============================================================
StudyAI Backend — Analytics Route
============================================================
GET /api/analytics — Retrieve user performance statistics
"""

from __future__ import annotations

from flask import Blueprint, g

from services.analytics_service import get_analytics
from middleware.auth_middleware import login_required
from utils.helpers import success_response, error_response
from utils.logger import get_logger

logger = get_logger(__name__)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/analytics")
@login_required
def retrieve_analytics():
    """
    Retrieve user analytics dashboard statistics. Protected.

    Returns:
        JSON response with comprehensive stats.
    """
    user_id = g.user_id

    try:
        data = get_analytics(user_id)
        return success_response(
            data=data,
            message="Analytics retrieved successfully."
        )
    except Exception as exc:
        logger.exception("Failed to build analytics dashboard")
        return error_response(f"Analytics generation failed: {exc}", 500)
