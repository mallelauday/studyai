"""
============================================================
StudyAI Backend — Study Material Model
============================================================
Data class representing an uploaded study material document.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any
from utils.helpers import generate_uuid, utc_now_iso


@dataclass
class StudyMaterial:
    """
    Represents an uploaded study document stored in Firestore / local JSON.

    Attributes:
        id:             UUID document identifier.
        user_id:        Owner's user ID.
        title:          Inferred or user-supplied title.
        filename:       Stored filename (UUID-based).
        original_name:  Original upload filename.
        filepath:       Absolute path to the file on disk.
        extension:      File extension without dot.
        content:        Extracted text content.
        word_count:     Number of words in *content*.
        char_count:     Number of characters in *content*.
        page_count:     Number of pages (PDF only; 1 otherwise).
        size_bytes:     File size in bytes.
        created_at:     ISO-8601 creation timestamp.
        updated_at:     ISO-8601 last-update timestamp.
        tags:           Optional user-supplied tags.
        status:         Processing status: "uploaded" | "processed" | "error".
    """

    user_id: str
    title: str
    filename: str
    original_name: str
    filepath: str
    extension: str
    content: str
    word_count: int
    char_count: int
    page_count: int = 1
    size_bytes: int = 0
    tags: list[str] = field(default_factory=list)
    status: str = "uploaded"
    id: str = field(default_factory=generate_uuid)
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)

    def to_dict(self) -> dict:
        """Return a JSON-serialisable dict representation."""
        return asdict(self)

    def to_response_dict(self) -> dict:
        """Return a dict safe for API responses (omits raw content)."""
        d = self.to_dict()
        d.pop("content", None)   # don't return full text in list responses
        d.pop("filepath", None)  # don't expose server paths
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "StudyMaterial":
        """Reconstruct a StudyMaterial from a stored dict."""
        return cls(
            id=data.get("id", generate_uuid()),
            user_id=data.get("user_id", ""),
            title=data.get("title", "Untitled"),
            filename=data.get("filename", ""),
            original_name=data.get("original_name", ""),
            filepath=data.get("filepath", ""),
            extension=data.get("extension", ""),
            content=data.get("content", ""),
            word_count=data.get("word_count", 0),
            char_count=data.get("char_count", 0),
            page_count=data.get("page_count", 1),
            size_bytes=data.get("size_bytes", 0),
            tags=data.get("tags", []),
            status=data.get("status", "uploaded"),
            created_at=data.get("created_at", utc_now_iso()),
            updated_at=data.get("updated_at", utc_now_iso()),
        )

    @property
    def preview(self) -> str:
        """Return the first 500 characters of content as a preview."""
        if len(self.content) <= 500:
            return self.content
        return self.content[:497] + "..."
