"""
============================================================
StudyAI Backend — Study Schedule Model
============================================================
Represents an AI-generated personalised study schedule.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from utils.helpers import generate_uuid, utc_now_iso


@dataclass
class StudySession:
    """A single study session within a day."""
    time_slot: str
    duration_minutes: int
    topic: str
    activity: str           # read | flashcards | quiz | practice | review | rest
    description: str
    priority: str           # high | medium | low
    resources: list[str] = field(default_factory=list)


@dataclass
class ScheduleDay:
    """Represents one day in the study schedule."""
    day: int
    date_label: str
    theme: str
    total_minutes: int
    sessions: list[dict] = field(default_factory=list)
    daily_goals: list[str] = field(default_factory=list)
    motivation_tip: str = ""


@dataclass
class StudySchedule:
    """
    AI-generated personalised study schedule.

    Attributes:
        id:                UUID schedule identifier.
        user_id:           Student's user ID.
        document_id:       Source study material ID.
        subject:           Subject being studied.
        title:             Schedule title.
        total_days:        Number of days in the schedule.
        total_hours:       Total study hours planned.
        exam_date:         Target exam date string.
        strategy:          Overall study strategy description.
        revision_strategy: "spaced repetition" | "active recall" | "mixed".
        days:              List of ScheduleDay dicts.
        weekly_tips:       General study tips.
        weak_topics:       Topics given extra attention.
        created_at:        ISO-8601 creation timestamp.
        status:            "active" | "completed" | "archived".
    """

    user_id: str
    document_id: str
    subject: str
    title: str
    total_days: int
    total_hours: float
    exam_date: str
    strategy: str
    revision_strategy: str = "mixed"
    days: list[dict] = field(default_factory=list)
    weekly_tips: list[str] = field(default_factory=list)
    weak_topics: list[str] = field(default_factory=list)
    status: str = "active"
    id: str = field(default_factory=generate_uuid)
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dict."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "StudySchedule":
        """Reconstruct a StudySchedule from a stored dict."""
        return cls(
            id=data.get("id", generate_uuid()),
            user_id=data.get("user_id", ""),
            document_id=data.get("document_id", ""),
            subject=data.get("subject", ""),
            title=data.get("title", "My Study Plan"),
            total_days=int(data.get("total_days", 7)),
            total_hours=float(data.get("total_hours", 0)),
            exam_date=data.get("exam_date", ""),
            strategy=data.get("strategy", ""),
            revision_strategy=data.get("revision_strategy", "mixed"),
            days=data.get("days", []),
            weekly_tips=data.get("weekly_tips", []),
            weak_topics=data.get("weak_topics", []),
            status=data.get("status", "active"),
            created_at=data.get("created_at", utc_now_iso()),
            updated_at=data.get("updated_at", utc_now_iso()),
        )

    @property
    def progress_percentage(self) -> float:
        """Estimate % of schedule days that should be done by today."""
        # Simple placeholder — real implementation would check current date
        return 0.0
