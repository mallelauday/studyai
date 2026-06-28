"""
============================================================
StudyAI Backend — Groq AI Service
============================================================
Wraps the Groq Python SDK to provide high-level AI generation
functions using the Llama 3.3-70B Versatile model.

All public methods follow the same contract:
    - Accept plain-Python arguments
    - Return parsed Python dicts / lists
    - Log and raise ``GroqServiceError`` on failure

Usage:
    from services.groq_service import GroqService
    groq = GroqService()
    summary = groq.generate_summary(text="...")
"""

import json
import re
from typing import Any

from groq import Groq, APIError, APIConnectionError, RateLimitError

from utils.logger import get_logger
from utils.helpers import safe_json_loads
from config import get_config

logger = get_logger(__name__)
Config = get_config()


# ── Custom Exceptions ─────────────────────────────────────

class GroqServiceError(Exception):
    """Raised when the Groq service encounters a non-recoverable error."""


class GroqUnavailableError(GroqServiceError):
    """Raised when Groq is not configured (missing API key)."""


# ── Prompt Templates ──────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are StudyAI, an expert educational assistant. "
    "Always respond with valid, parseable JSON unless explicitly told otherwise. "
    "Be accurate, concise, and pedagogically sound."
)

_SUMMARY_PROMPT = """
Analyse the following study material and generate a comprehensive summary.

Return a JSON object with this exact structure:
{{
  "title": "concise title of the material",
  "overview": "2-3 sentence high-level overview",
  "key_points": ["point 1", "point 2", "..."],
  "important_concepts": [{{"term": "...", "definition": "..."}}],
  "learning_objectives": ["objective 1", "objective 2"],
  "difficulty_level": "beginner | intermediate | advanced",
  "estimated_study_time_minutes": <integer>
}}

Study Material:
---
{text}
---
"""

_FLASHCARDS_PROMPT = """
Create {count} flashcards from the following study material.

Return a JSON array with this exact structure:
[
  {{
    "question": "question text",
    "answer": "concise answer",
    "topic": "topic/section this belongs to",
    "difficulty": "easy | medium | hard",
    "hint": "optional hint for struggling students"
  }}
]

Study Material:
---
{text}
---
"""

_QUIZ_PROMPT = """
Generate a {count}-question multiple-choice quiz on the following material.
Difficulty level: {difficulty}

Return a JSON array with this exact structure:
[
  {{
    "question": "question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "why this is correct",
    "topic": "topic tested",
    "difficulty": "easy | medium | hard",
    "points": <1-3>
  }}
]

Study Material:
---
{text}
---
"""

_SCHEDULE_PROMPT = """
Create a personalised study schedule based on the following information:

Subject: {subject}
Available days per week: {days_per_week}
Minutes per session: {minutes_per_session}
Exam date: {exam_date}
Current proficiency: {proficiency}
Weak topics: {weak_topics}

Return a JSON object with this exact structure:
{{
  "total_weeks": <integer>,
  "weekly_hours": <float>,
  "schedule": [
    {{
      "week": 1,
      "focus": "main topic for this week",
      "daily_sessions": [
        {{
          "day": "Monday",
          "topic": "specific topic",
          "duration_minutes": <integer>,
          "activities": ["activity 1", "activity 2"]
        }}
      ],
      "goals": ["goal 1", "goal 2"]
    }}
  ],
  "tips": ["study tip 1", "study tip 2"]
}}
"""

_WEAK_TOPICS_PROMPT = """
Analyse the following quiz results and identify weak topics that need improvement.

Quiz results:
{results}

Return a JSON object:
{{
  "weak_topics": [
    {{
      "topic": "topic name",
      "score_percentage": <0-100>,
      "reason": "why this topic is weak",
      "recommended_resources": ["resource 1", "resource 2"],
      "practice_questions": ["question 1", "question 2"]
    }}
  ],
  "overall_score": <0-100>,
  "strengths": ["strength 1", "strength 2"],
  "priority_study_order": ["topic to study first", "topic 2"]
}}
"""


# ── Groq Service ──────────────────────────────────────────

class GroqService:
    """
    High-level wrapper around the Groq SDK.

    Instantiate once and reuse — the underlying ``Groq`` client
    maintains its own connection pool.
    """

    def __init__(self):
        if not Config.is_groq_configured():
            logger.warning(
                "GROQ_API_KEY is not set — GroqService will raise on every call."
            )
            self._client = None
            return

        try:
            self._client = Groq(api_key=Config.GROQ_API_KEY)
            logger.info(
                "✅ Groq client initialised — model: %s, max_tokens: %d",
                Config.GROQ_MODEL,
                Config.GROQ_MAX_TOKENS,
            )
        except Exception as exc:
            logger.error("Failed to initialise Groq client: %s", exc)
            self._client = None

    # ── Internal chat helper ──────────────────────────────

    def _chat(self, user_prompt: str, system_prompt: str = _SYSTEM_PROMPT) -> str:
        """
        Send a chat completion request to Groq.

        Args:
            user_prompt:   The user-role message.
            system_prompt: The system-role message.

        Returns:
            Raw response content string.

        Raises:
            GroqUnavailableError: If the client is not configured.
            GroqServiceError:     On API or network errors.
        """
        if self._client is None:
            raise GroqUnavailableError(
                "Groq API key is not configured. Set GROQ_API_KEY in .env."
            )

        try:
            response = self._client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=Config.GROQ_MAX_TOKENS,
                temperature=Config.GROQ_TEMPERATURE,
            )
            content = response.choices[0].message.content
            logger.debug(
                "Groq response: %d chars | tokens used: %s",
                len(content),
                getattr(response.usage, "total_tokens", "N/A"),
            )
            return content

        except RateLimitError as exc:
            logger.error("Groq rate limit exceeded: %s", exc)
            raise GroqServiceError("Groq API rate limit exceeded. Please try again later.") from exc
        except APIConnectionError as exc:
            logger.error("Groq connection error: %s", exc)
            raise GroqServiceError("Cannot connect to Groq API. Check your network.") from exc
        except APIError as exc:
            logger.error("Groq API error %s: %s", exc.status_code, exc.message)
            raise GroqServiceError(f"Groq API error: {exc.message}") from exc
        except Exception as exc:
            logger.exception("Unexpected Groq error")
            raise GroqServiceError(f"Unexpected error: {exc}") from exc

    def _parse_json_response(self, raw: str) -> Any:
        """
        Extract and parse the first JSON object/array from *raw*.

        Strips markdown code fences if present.
        """
        # Strip ```json ... ``` fences
        fenced = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
        if fenced:
            raw = fenced.group(1)

        parsed = safe_json_loads(raw.strip())
        if parsed is None:
            logger.error("Failed to parse JSON from Groq response: %.200s", raw)
            raise GroqServiceError("AI returned an invalid response format.")
        return parsed

    # ── Public AI Functions ───────────────────────────────

    def generate_summary(self, text: str) -> dict:
        """
        Generate a structured summary of study material.

        Args:
            text: Raw text content extracted from the uploaded file.

        Returns:
            Dict matching the summary JSON schema.
        """
        logger.info("Generating summary (text length: %d chars)", len(text))
        prompt = _SUMMARY_PROMPT.format(text=text[:8000])  # cap at ~8k chars
        raw = self._chat(prompt)
        return self._parse_json_response(raw)

    def generate_flashcards(self, text: str, count: int = 10) -> list[dict]:
        """
        Generate flashcards from study material.

        Args:
            text:  Study material text.
            count: Number of flashcards to generate (1–50).

        Returns:
            List of flashcard dicts.
        """
        count = max(1, min(count, 50))
        logger.info("Generating %d flashcards", count)
        prompt = _FLASHCARDS_PROMPT.format(text=text[:8000], count=count)
        raw = self._chat(prompt)
        result = self._parse_json_response(raw)
        return result if isinstance(result, list) else result.get("flashcards", [])

    def generate_quiz(
        self,
        text: str,
        count: int = 10,
        difficulty: str = "medium",
    ) -> list[dict]:
        """
        Generate a multiple-choice quiz.

        Args:
            text:       Study material text.
            count:      Number of questions (1–50).
            difficulty: ``"easy"``, ``"medium"``, or ``"hard"``.

        Returns:
            List of question dicts.
        """
        count = max(1, min(count, 50))
        difficulty = difficulty.lower() if difficulty in ("easy", "medium", "hard") else "medium"
        logger.info("Generating %d-question %s quiz", count, difficulty)
        prompt = _QUIZ_PROMPT.format(text=text[:8000], count=count, difficulty=difficulty)
        raw = self._chat(prompt)
        result = self._parse_json_response(raw)
        return result if isinstance(result, list) else result.get("questions", [])

    def generate_schedule(
        self,
        subject: str,
        days_per_week: int = 5,
        minutes_per_session: int = 60,
        exam_date: str = "4 weeks from now",
        proficiency: str = "beginner",
        weak_topics: list[str] | None = None,
    ) -> dict:
        """
        Generate a personalised study schedule.

        Args:
            subject:              Name of the subject.
            days_per_week:        How many days per week to study.
            minutes_per_session:  Duration of each study session.
            exam_date:            Target exam date string.
            proficiency:          Student's current level.
            weak_topics:          List of topics needing extra attention.

        Returns:
            Schedule dict.
        """
        logger.info("Generating study schedule for subject: %s", subject)
        topics_str = ", ".join(weak_topics or []) or "None identified"
        prompt = _SCHEDULE_PROMPT.format(
            subject=subject,
            days_per_week=days_per_week,
            minutes_per_session=minutes_per_session,
            exam_date=exam_date,
            proficiency=proficiency,
            weak_topics=topics_str,
        )
        raw = self._chat(prompt)
        return self._parse_json_response(raw)

    def identify_weak_topics(self, results: list[dict]) -> dict:
        """
        Analyse quiz results to identify weak areas.

        Args:
            results: List of result dicts (each should include
                     ``topic``, ``score``, ``total``).

        Returns:
            Analysis dict with weak topics, strengths, and recommendations.
        """
        logger.info("Identifying weak topics from %d result(s)", len(results))
        results_str = json.dumps(results, indent=2)
        prompt = _WEAK_TOPICS_PROMPT.format(results=results_str)
        raw = self._chat(prompt)
        return self._parse_json_response(raw)

    def validate_connection(self) -> dict:
        """
        Perform a minimal API call to verify Groq connectivity.

        Returns:
            Dict with ``connected`` (bool), ``model`` (str), and optional ``error``.
        """
        if self._client is None:
            return {"connected": False, "error": "API key not configured", "model": None}

        try:
            response = self._client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[{"role": "user", "content": "Respond with: OK"}],
                max_tokens=5,
            )
            reply = response.choices[0].message.content.strip()
            return {
                "connected": True,
                "model": Config.GROQ_MODEL,
                "test_response": reply,
            }
        except Exception as exc:
            logger.error("Groq connection validation failed: %s", exc)
            return {"connected": False, "error": str(exc), "model": Config.GROQ_MODEL}
