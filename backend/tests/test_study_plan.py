"""
============================================================
StudyAI Backend — Test Suite: Study Plan and Profile API
============================================================
Runs with:   pytest tests/test_study_plan.py -v
"""

import pytest
import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from utils.jwt_utils import create_access_token
from services.firebase_service import StorageRouter

@pytest.fixture
def client():
    """Create a Flask test client with testing config."""
    app = create_app()
    app.config["TESTING"] = True
    app.config["DEBUG"] = False
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers():
    """Generate authentication headers with a valid Flask-native JWT."""
    token = create_access_token(
        uid="test-user-123",
        email="alex@studyai.edu",
        role="student",
        display_name="Alex Student"
    )
    return {"Authorization": f"Bearer {token}"}


class TestProfileUpdateContract:

    def test_put_profile_success(self, client, auth_headers):
        """PUT /api/user/profile should update the profile and return normalized user object."""
        payload = {
            "display_name": "Alex Modified",
            "email": "alex_mod@studyai.edu",
            "avatar_url": "https://example.com/avatar_new.png"
        }
        resp = client.put("/api/user/profile", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        
        body = resp.get_json()
        assert body["success"] is True
        assert body["error"] is None
        assert "user" in body
        assert body["user"]["uid"] == "test-user-123"
        assert body["user"]["display_name"] == "Alex Modified"
        assert body["user"]["email"] == "alex_mod@studyai.edu"
        assert body["user"]["avatar_url"] == "https://example.com/avatar_new.png"


class TestStudyPlanContract:

    def test_generate_and_get_study_plan(self, client, auth_headers):
        # We will mock the Groq _chat to avoid live API call during unit tests
        from unittest.mock import patch
        with patch("services.groq_service.GroqService._chat") as mock_chat:
            mock_chat.return_value = '[{"date": "2026-06-28", "tasks": ["Math revision", "AI quiz practice"], "completed": false}]'
            
            payload = {
                "subject": "Mathematics",
                "exam_date": "2026-06-28",
                "difficulty": "medium"
            }
            resp = client.post("/api/study-plan/generate", json=payload, headers=auth_headers)
            assert resp.status_code == 200
            
            body = resp.get_json()
            assert body["success"] is True
            assert len(body["plan"]) == 1
            assert body["plan"][0]["date"] == "2026-06-28"
            assert body["plan"][0]["tasks"] == ["Math revision", "AI quiz practice"]
            assert body["plan"][0]["completed"] is False
            
            # Test GET /api/study-plan
            get_resp = client.get("/api/study-plan", headers=auth_headers)
            assert get_resp.status_code == 200
            get_body = get_resp.get_json()
            assert get_body["success"] is True
            assert len(get_body["plan"]) == 1
            assert get_body["plan"][0]["date"] == "2026-06-28"

    def test_update_study_plan(self, client, auth_headers):
        # Create a mock study plan in database first
        plan_doc = {
            "id": "mock-plan-id-777",
            "user_id": "test-user-123",
            "subject": "Physics",
            "exam_date": "2026-06-29",
            "difficulty": "easy",
            "days": [
                {"date": "2026-06-28", "tasks": ["Physics study"], "completed": False}
            ]
        }
        # Clean up any existing store file first to prevent duplicate key error if tests ran before
        router = StorageRouter("study_plans")
        router.delete("mock-plan-id-777")
        router.create("mock-plan-id-777", plan_doc)

        update_payload = {
            "days": [
                {"date": "2026-06-28", "tasks": ["Physics study"], "completed": True}
            ]
        }
        
        resp = client.put("/api/study-plan", json=update_payload, headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["plan"][0]["completed"] is True


class TestExportPipelineContract:

    def test_export_pdf_headers(self, client, auth_headers):
        # Setup mock study plan
        plan_doc = {
            "id": "mock-plan-id-888",
            "user_id": "test-user-123",
            "subject": "Chemistry",
            "exam_date": "2026-06-30",
            "difficulty": "hard",
            "days": [
                {"date": "2026-06-28", "tasks": ["Chemistry study"], "completed": False}
            ]
        }
        router = StorageRouter("study_plans")
        router.delete("mock-plan-id-888")
        router.create("mock-plan-id-888", plan_doc)
        
        resp = client.get("/api/export/pdf?type=study-plan&id=mock-plan-id-888", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers["Content-Type"] == "application/pdf"
        assert "Content-Disposition" in resp.headers
        assert "attachment" in resp.headers["Content-Disposition"]
