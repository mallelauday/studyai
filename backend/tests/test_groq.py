"""
============================================================
StudyAI Backend — Test Suite: Groq AI Service
============================================================
Runs with:   pytest tests/test_groq.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import get_config
from services.groq_service import GroqService, GroqServiceError, GroqUnavailableError

Config = get_config()

SAMPLE_TEXT = """
Photosynthesis is the process by which green plants, algae, and some bacteria 
convert light energy into chemical energy stored in glucose. It occurs mainly 
in the chloroplasts using chlorophyll. The overall equation is:

6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

There are two main stages:
1. Light-dependent reactions (in the thylakoid membranes)
2. Calvin cycle / Light-independent reactions (in the stroma)

Factors affecting the rate: light intensity, CO₂ concentration, temperature.
"""


class TestGroqServiceInit:

    def test_groq_service_instantiates(self):
        """GroqService must instantiate without raising."""
        try:
            groq = GroqService()
        except Exception as exc:
            pytest.fail(f"GroqService() raised unexpectedly: {exc}")

    def test_groq_configured_flag(self):
        """Config.is_groq_configured() must return a bool."""
        assert isinstance(Config.is_groq_configured(), bool)

    def test_validate_connection_returns_dict(self):
        """validate_connection() must return a dict with 'connected'."""
        groq = GroqService()
        result = groq.validate_connection()
        assert isinstance(result, dict)
        assert "connected" in result

    def test_validate_connection_not_configured(self):
        """When API key is missing, connected must be False."""
        if not Config.is_groq_configured():
            groq = GroqService()
            result = groq.validate_connection()
            assert result["connected"] is False


class TestGroqServiceErrors:

    def test_generate_summary_raises_when_unconfigured(self):
        """Calls to AI functions must raise GroqUnavailableError without a key."""
        if Config.is_groq_configured():
            pytest.skip("Groq is configured — skipping unavailability test.")
        groq = GroqService()
        with pytest.raises(GroqUnavailableError):
            groq.generate_summary(SAMPLE_TEXT)

    def test_generate_flashcards_raises_when_unconfigured(self):
        if Config.is_groq_configured():
            pytest.skip("Groq is configured — skipping unavailability test.")
        groq = GroqService()
        with pytest.raises(GroqUnavailableError):
            groq.generate_flashcards(SAMPLE_TEXT)

    def test_generate_quiz_raises_when_unconfigured(self):
        if Config.is_groq_configured():
            pytest.skip("Groq is configured — skipping unavailability test.")
        groq = GroqService()
        with pytest.raises(GroqUnavailableError):
            groq.generate_quiz(SAMPLE_TEXT)


class TestGroqServiceIntegration:
    """
    Live API tests — only run when GROQ_API_KEY is set.
    Skipped automatically when the key is absent.
    """

    @pytest.fixture(autouse=True)
    def require_groq(self):
        if not Config.is_groq_configured():
            pytest.skip("GROQ_API_KEY not set — skipping Groq integration tests.")

    @pytest.fixture
    def groq(self):
        return GroqService()

    def test_validate_connection_live(self, groq):
        result = groq.validate_connection()
        assert result["connected"] is True, f"Groq connection failed: {result.get('error')}"

    def test_generate_summary_returns_dict(self, groq):
        result = groq.generate_summary(SAMPLE_TEXT)
        assert isinstance(result, dict)
        assert "key_points" in result or "overview" in result

    def test_generate_flashcards_returns_list(self, groq):
        result = groq.generate_flashcards(SAMPLE_TEXT, count=3)
        assert isinstance(result, list)
        assert len(result) >= 1
        assert "question" in result[0]
        assert "answer" in result[0]

    def test_generate_quiz_returns_list(self, groq):
        result = groq.generate_quiz(SAMPLE_TEXT, count=3, difficulty="easy")
        assert isinstance(result, list)
        assert len(result) >= 1
        assert "question" in result[0]
        assert "options" in result[0]
        assert "correct_answer" in result[0]

    def test_generate_schedule_returns_dict(self, groq):
        result = groq.generate_schedule(
            subject="Biology",
            days_per_week=5,
            minutes_per_session=45,
            exam_date="2 weeks from now",
            proficiency="beginner",
            weak_topics=["Photosynthesis"],
        )
        assert isinstance(result, dict)
        assert "schedule" in result or "weekly_hours" in result

    def test_identify_weak_topics_returns_dict(self, groq):
        sample_results = [
            {"topic": "Photosynthesis", "score": 3, "total": 10},
            {"topic": "Cell Division", "score": 9, "total": 10},
        ]
        result = groq.identify_weak_topics(sample_results)
        assert isinstance(result, dict)
        assert "weak_topics" in result
