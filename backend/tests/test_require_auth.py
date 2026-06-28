"""
============================================================
StudyAI Backend — Test Suite: Require Auth Middleware
============================================================
Runs with:   pytest tests/test_require_auth.py -v
"""

import pytest
import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from utils.jwt_utils import create_access_token

@pytest.fixture
def client():
    """Create a Flask test client with testing config."""
    app = create_app()
    app.config["TESTING"] = True
    app.config["DEBUG"] = False
    with app.test_client() as client:
        yield client


class TestRequireAuthMiddleware:

    def test_missing_auth_header(self, client):
        """Should return 401 when Authorization header is missing."""
        resp = client.get("/api/profile")
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["success"] is False
        assert data["error"] == "Authorization token missing."

    def test_invalid_header_format(self, client):
        """Should return 401 when Authorization header format is incorrect."""
        resp = client.get("/api/profile", headers={"Authorization": "Bearer"})
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["success"] is False
        assert data["error"] == "Authorization token missing."

        resp2 = client.get("/api/profile", headers={"Authorization": "Basic token123"})
        assert resp2.status_code == 401
        data2 = resp2.get_json()
        assert data2["success"] is False
        assert data2["error"] == "Authorization token missing."

    def test_invalid_or_expired_token(self, client):
        """Should return 401 when token verification fails or is expired."""
        # Test Invalid Token
        resp = client.get("/api/profile", headers={"Authorization": "Bearer invalid-token"})
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["success"] is False
        assert data["error"] == "Invalid access token."

    def test_valid_token_success(self, client):
        """Should return 200 and correct user profile details on valid token."""
        token = create_access_token(
            uid="firebase-uid-999",
            email="student@studyai.edu",
            role="student",
            display_name="Alex Student"
        )
        resp = client.get("/api/profile", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["data"]["user"]["uid"] == "firebase-uid-999"
        assert data["data"]["user"]["email"] == "student@studyai.edu"
        assert data["data"]["user"]["display_name"] == "Alex Student"
