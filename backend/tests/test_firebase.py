"""
============================================================
StudyAI Backend — Test Suite: Firebase Configuration
============================================================
Runs with:   pytest tests/test_firebase.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import get_config
from firebase.firebase_config import (
    init_firebase,
    is_firebase_available,
    validate_connection,
    get_collection,
    get_firestore,
)

Config = get_config()


class TestFirebaseConfig:

    def test_firebase_config_detection(self):
        """Config class should correctly detect whether Firebase is set up."""
        is_configured = Config.is_firebase_configured()
        # This test passes regardless — it just validates the detection logic
        assert isinstance(is_configured, bool)

    def test_init_firebase_does_not_raise(self):
        """init_firebase() must not raise, even with missing credentials."""
        try:
            init_firebase()
        except Exception as exc:
            pytest.fail(f"init_firebase() raised unexpectedly: {exc}")

    def test_is_firebase_available_returns_bool(self):
        """is_firebase_available() must return a bool."""
        result = is_firebase_available()
        assert isinstance(result, bool)

    def test_validate_connection_returns_dict(self):
        """validate_connection() must always return a dict with 'connected'."""
        result = validate_connection()
        assert isinstance(result, dict)
        assert "connected" in result

    def test_get_collection_returns_none_when_unavailable(self):
        """If Firebase is not available, get_collection() must return None."""
        if not is_firebase_available():
            result = get_collection("materials")
            assert result is None

    def test_get_firestore_returns_none_when_unavailable(self):
        """If Firebase is not available, get_firestore() must return None."""
        if not is_firebase_available():
            assert get_firestore() is None

    def test_collections_config_has_all_required(self):
        """All required Firestore collections must be present in Config."""
        required = {
            "users", "materials", "summaries", "flashcards",
            "quizzes", "results", "analytics", "schedules", "weak_topics",
        }
        configured = set(Config.COLLECTIONS.keys())
        missing = required - configured
        assert not missing, f"Missing collections in Config: {missing}"


class TestFirebaseIntegration:
    """
    Integration tests — only run when Firebase is fully configured.
    Skipped automatically in local dev / CI without credentials.
    """

    @pytest.fixture(autouse=True)
    def require_firebase(self):
        if not is_firebase_available():
            pytest.skip("Firebase not configured — skipping integration tests.")

    def test_firestore_client_available(self):
        """Firestore client should not be None when Firebase is available."""
        assert get_firestore() is not None

    def test_validate_connection_live(self):
        """Live connection validation should succeed."""
        result = validate_connection()
        assert result["connected"] is True, f"Connection failed: {result.get('error')}"

    def test_get_collection_materials(self):
        """Should return a CollectionReference for 'materials'."""
        col = get_collection("materials")
        assert col is not None
