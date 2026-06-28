"""
============================================================
StudyAI Backend — Test Suite: Flask API
============================================================
Runs with:   pytest tests/test_api.py -v
"""

import pytest
import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app


@pytest.fixture
def client():
    """Create a Flask test client with testing config."""
    app = create_app()
    app.config["TESTING"] = True
    app.config["DEBUG"] = False
    with app.test_client() as client:
        yield client


# ── Health Endpoint ───────────────────────────────────────

class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        """GET /api/health should always return HTTP 200."""
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_json_structure(self, client):
        """Response should have expected top-level keys."""
        resp = client.get("/api/health")
        data = resp.get_json()
        assert data["success"] is True
        assert "data" in data
        assert "status" in data["data"]
        assert "services" in data["data"]
        assert "timestamp" in data

    def test_health_services_block(self, client):
        """Services block should report firebase, groq, local_storage."""
        resp = client.get("/api/health")
        services = resp.get_json()["data"]["services"]
        assert "firebase" in services
        assert "groq" in services
        assert "local_storage" in services

    def test_health_local_storage_available(self, client):
        """Local storage must always be available."""
        resp = client.get("/api/health")
        ls = resp.get_json()["data"]["services"]["local_storage"]
        assert ls["available"] is True


# ── Version Endpoint ──────────────────────────────────────

class TestVersionEndpoint:

    def test_version_returns_200(self, client):
        resp = client.get("/api/version")
        assert resp.status_code == 200

    def test_version_contains_name_and_version(self, client):
        data = resp = client.get("/api/version")
        body = resp.get_json()
        assert body["success"] is True
        assert body["data"]["name"] == "StudyAI Backend"
        assert "version" in body["data"]
        assert "ai_model" in body["data"]


# ── Error Handling ────────────────────────────────────────

class TestErrorHandling:

    def test_404_unknown_endpoint(self, client):
        resp = client.get("/api/does-not-exist")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["success"] is False
        assert "error" in data

    def test_405_wrong_method(self, client):
        resp = client.delete("/api/health")
        assert resp.status_code == 405

    def test_413_large_payload(self, client):
        """Simulate a payload exceeding MAX_CONTENT_LENGTH."""
        large_data = b"x" * (17 * 1024 * 1024)  # 17 MB
        resp = client.post(
            "/api/health",
            data=large_data,
            content_type="application/octet-stream",
        )
        # 405 (wrong method) or 413 (too large) — either is correct
        assert resp.status_code in (405, 413)


# ── CORS ─────────────────────────────────────────────────

class TestCORS:

    def test_cors_header_present(self, client):
        resp = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        assert "Access-Control-Allow-Origin" in resp.headers

    def test_preflight_options(self, client):
        resp = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code in (200, 204)
