"""
============================================================
StudyAI Backend — Quiz Result Model
============================================================
Represents a student's quiz submission and graded result.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from utils.helpers import generate_uuid, utc_now_iso


@dataclass
class QuizResult:
    """
    Stores a graded quiz submission.

    Attributes:
        id:              UUID result identifier.
        user_id:         Student's user ID.
        quiz_id:         ID of the source quiz.
        document_id:     ID of the source study material.
        document_title:  Title of the study material.
        score:           Percentage score (0–100).
        grade:           Letter grade (A/B/C/D/F).
        performance:     Human label (excellent/good/average/needs_improvement).
        total_questions: Total number of questions in the quiz.
        correct:         Number of correctly answered questions.
        incorrect:       Number of incorrectly answered questions.
        points_earned:   Total points scored.
        points_possible: Maximum possible points.
        graded_answers:  List of per-question graded answer dicts.
        weak_topics:     Topics with mastery < 60%.
        all_topics:      All topics with mastery statistics.
        ai_analysis:     Optional AI-generated analysis dict.
        created_at:      ISO-8601 submission timestamp.
    """

    user_id: str
    quiz_id: str
    document_id: str
    document_title: str
    score: float
    grade: str
    performance: str
    total_questions: int
    correct: int
    incorrect: int
    points_earned: int
    points_possible: int
    graded_answers: list[dict] = field(default_factory=list)
    weak_topics: list[dict] = field(default_factory=list)
    all_topics: list[dict] = field(default_factory=list)
    ai_analysis: dict = field(default_factory=dict)
    id: str = field(default_factory=generate_uuid)
    created_at: str = field(default_factory=utc_now_iso)

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dict."""
        return asdict(self)

    def to_summary_dict(self) -> dict:
        """Return a lightweight summary dict (omits graded_answers detail)."""
        d = self.to_dict()
        d.pop("graded_answers", None)
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "QuizResult":
        """Reconstruct a QuizResult from a stored dict."""
        return cls(
            id=data.get("id", generate_uuid()),
            user_id=data.get("user_id", ""),
            quiz_id=data.get("quiz_id", ""),
            document_id=data.get("document_id", ""),
            document_title=data.get("document_title", ""),
            score=float(data.get("score", 0)),
            grade=data.get("grade", "F"),
            performance=data.get("performance", ""),
            total_questions=int(data.get("total_questions", 0)),
            correct=int(data.get("correct", 0)),
            incorrect=int(data.get("incorrect", 0)),
            points_earned=int(data.get("points_earned", 0)),
            points_possible=int(data.get("points_possible", 0)),
            graded_answers=data.get("graded_answers", []),
            weak_topics=data.get("weak_topics", []),
            all_topics=data.get("all_topics", []),
            ai_analysis=data.get("ai_analysis", {}),
            created_at=data.get("created_at", utc_now_iso()),
        )

    @property
    def passed(self) -> bool:
        """Return True if the student scored >= 60%."""
        return self.score >= 60.0
