"""
============================================================
StudyAI Backend — User Model
============================================================
Data class representing a User in the system.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from utils.helpers import utc_now_iso


@dataclass
class User:
    """
    Represents a registered user in StudyAI.

    Attributes:
        uid:            Unique Firebase Auth UID.
        email:          User's email address.
        display_name:   User's display/profile name.
        created_at:     ISO-8601 creation timestamp.
        last_login_at:  ISO-8601 last login timestamp.
        role:           User role (e.g., "student", "admin").
    """

    uid: str
    email: str
    display_name: str = ""
    avatar_url: str = ""
    created_at: str = field(default_factory=utc_now_iso)
    last_login_at: str = field(default_factory=utc_now_iso)
    role: str = "student"

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dict."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """Reconstruct a User from a dict."""
        return cls(
            uid=data.get("uid", ""),
            email=data.get("email", ""),
            display_name=data.get("display_name", ""),
            avatar_url=data.get("avatar_url", ""),
            created_at=data.get("created_at", utc_now_iso()),
            last_login_at=data.get("last_login_at", utc_now_iso()),
            role=data.get("role", "student"),
        )
