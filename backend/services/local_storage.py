"""
============================================================
StudyAI Backend — Local JSON Storage Service
============================================================
Provides a simple CRUD interface backed by flat JSON files.
Used when Firebase is not configured or unavailable.

File layout (all inside Config.STORAGE_FOLDER):
    materials.json
    summaries.json
    flashcards.json
    quizzes.json
    results.json
    schedules.json
    analytics.json
    weak_topics.json
"""

import json
import threading
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

from utils.logger import get_logger
from utils.helpers import utc_now_iso
from config import get_config

logger = get_logger(__name__)
Config = get_config()

# ── Thread-safety lock (shared across all instances) ──────
_lock = threading.Lock()

# ── Storage file map ──────────────────────────────────────
_STORES = [
    "users",        # user profiles (Firebase fallback)
    "materials",
    "summaries",
    "flashcards",
    "quizzes",
    "results",
    "schedules",
    "analytics",
    "weak_topics",
    "study_plans",
]


def _store_path(collection: str) -> Path:
    """Return the Path for a given collection's JSON file."""
    return Config.STORAGE_FOLDER / f"{collection}.json"


def _read_store(collection: str) -> dict:
    """Load the JSON store for *collection*. Returns empty dict on error."""
    path = _store_path(collection)
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read store '%s': %s", collection, exc)
        return {}


def _write_store(collection: str, data: dict) -> None:
    """Persist *data* dict to the collection's JSON file."""
    path = _store_path(collection)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def init_local_storage() -> None:
    """Create all storage JSON files if they don't already exist."""
    Config.STORAGE_FOLDER.mkdir(parents=True, exist_ok=True)
    for name in _STORES:
        path = _store_path(name)
        if not path.exists():
            _write_store(name, {})
    logger.info("✅ Local JSON storage initialised at: %s", Config.STORAGE_FOLDER)


# ── CRUD Operations ───────────────────────────────────────

class LocalStorage:
    """
    Simple key-value CRUD store backed by a single JSON file.

    Args:
        collection: Logical collection name (e.g. ``"materials"``).
    """

    def __init__(self, collection: str):
        if collection not in _STORES:
            logger.warning("Unknown collection '%s' — creating new store.", collection)
        self.collection = collection

    # ── Create ────────────────────────────────────────────

    def create(self, doc_id: str, data: dict) -> dict:
        """
        Create a new document.

        Args:
            doc_id: Unique document ID (typically a UUID).
            data:   Document payload.

        Returns:
            The saved document dict (includes ``id``, ``created_at``, ``updated_at``).

        Raises:
            ValueError: If *doc_id* already exists.
        """
        with _lock:
            store = _read_store(self.collection)
            if doc_id in store:
                raise ValueError(f"Document '{doc_id}' already exists in '{self.collection}'.")
            now = utc_now_iso()
            document = {
                **data,
                "id": doc_id,
                "created_at": now,
                "updated_at": now,
            }
            store[doc_id] = document
            _write_store(self.collection, store)
            logger.debug("Created doc %s in '%s'", doc_id, self.collection)
            return document

    # ── Read ──────────────────────────────────────────────

    def get(self, doc_id: str) -> dict | None:
        """Return a document by ID, or ``None`` if not found."""
        store = _read_store(self.collection)
        return store.get(doc_id)

    def get_all(self) -> list[dict]:
        """Return all documents as a list, sorted by ``created_at`` desc."""
        store = _read_store(self.collection)
        docs = list(store.values())
        docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
        return docs

    def filter_by(self, field: str, value: Any) -> list[dict]:
        """Return documents where ``document[field] == value``."""
        return [d for d in self.get_all() if d.get(field) == value]

    def filter_by_user(self, user_id: str) -> list[dict]:
        """Shorthand for ``filter_by('user_id', user_id)``."""
        return self.filter_by("user_id", user_id)

    # ── Update ────────────────────────────────────────────

    def update(self, doc_id: str, data: dict) -> dict | None:
        """
        Partially update a document (merge semantics).

        Args:
            doc_id: Document ID to update.
            data:   Fields to merge into the existing document.

        Returns:
            Updated document, or ``None`` if not found.
        """
        with _lock:
            store = _read_store(self.collection)
            if doc_id not in store:
                logger.warning("Update: doc '%s' not found in '%s'.", doc_id, self.collection)
                return None
            store[doc_id] = {
                **store[doc_id],
                **data,
                "id": doc_id,                    # id is immutable
                "updated_at": utc_now_iso(),
            }
            _write_store(self.collection, store)
            logger.debug("Updated doc %s in '%s'", doc_id, self.collection)
            return store[doc_id]

    # ── Delete ────────────────────────────────────────────

    def delete(self, doc_id: str) -> bool:
        """
        Delete a document by ID.

        Returns:
            ``True`` if deleted, ``False`` if not found.
        """
        with _lock:
            store = _read_store(self.collection)
            if doc_id not in store:
                return False
            del store[doc_id]
            _write_store(self.collection, store)
            logger.debug("Deleted doc %s from '%s'", doc_id, self.collection)
            return True

    # ── Count ─────────────────────────────────────────────

    def count(self) -> int:
        """Return the number of documents in the collection."""
        return len(_read_store(self.collection))

    def exists(self, doc_id: str) -> bool:
        """Return True if a document with *doc_id* exists."""
        return doc_id in _read_store(self.collection)
