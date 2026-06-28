"""
============================================================
StudyAI Backend — Firebase CRUD Service
============================================================
Thin wrapper around the Firestore client that provides
typed CRUD operations for all StudyAI collections.

Falls back silently — callers must always check the return
value and route to local_storage when None is returned.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from firebase.firebase_config import get_firestore, is_firebase_available, get_collection
from utils.logger import get_logger
from utils.helpers import utc_now_iso

logger = get_logger(__name__)


def _db():
    """Return the Firestore client or None."""
    return get_firestore()


def _ts() -> str:
    return utc_now_iso()


# ══════════════════════════════════════════════════════════
# Generic CRUD helpers
# ══════════════════════════════════════════════════════════

def fb_create(collection: str, doc_id: str, data: dict) -> dict | None:
    """
    Write a new document to Firestore.

    Args:
        collection: Logical collection name (e.g. ``"materials"``).
        doc_id:     Document ID (UUID string).
        data:       Document payload dict.

    Returns:
        The saved document dict (with ``id``, ``created_at``, ``updated_at``),
        or ``None`` if Firebase is unavailable.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        now = _ts()
        document = {**data, "id": doc_id, "created_at": now, "updated_at": now}
        col.document(doc_id).set(document)
        logger.debug("FB create: %s/%s", collection, doc_id)
        return document
    except Exception as exc:
        logger.error("FB create failed [%s/%s]: %s", collection, doc_id, exc)
        return None


def fb_get(collection: str, doc_id: str) -> dict | None:
    """
    Fetch a document by ID from Firestore.

    Returns the document dict, or ``None`` if not found / unavailable.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        doc = col.document(doc_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as exc:
        logger.error("FB get failed [%s/%s]: %s", collection, doc_id, exc)
        return None


def fb_get_all(collection: str, limit: int = 100) -> list[dict] | None:
    """
    Return up to *limit* documents from a Firestore collection.

    Returns a list (possibly empty) or ``None`` if unavailable.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        docs = col.limit(limit).stream()
        return [d.to_dict() for d in docs]
    except Exception as exc:
        logger.error("FB get_all failed [%s]: %s", collection, exc)
        return None


def fb_query(
    collection: str,
    field: str,
    value: Any,
    limit: int = 100,
) -> list[dict] | None:
    """
    Query Firestore where ``field == value``.

    Returns a list or ``None`` if unavailable.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        docs = col.where(field, "==", value).limit(limit).stream()
        return [d.to_dict() for d in docs]
    except Exception as exc:
        logger.error("FB query failed [%s where %s=%s]: %s", collection, field, value, exc)
        return None


def fb_update(collection: str, doc_id: str, data: dict) -> dict | None:
    """
    Merge *data* into an existing Firestore document.

    Returns the update payload (with ``updated_at``) or ``None`` on failure.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        update_data = {**data, "updated_at": _ts()}
        col.document(doc_id).update(update_data)
        logger.debug("FB update: %s/%s", collection, doc_id)
        return update_data
    except Exception as exc:
        logger.error("FB update failed [%s/%s]: %s", collection, doc_id, exc)
        return None


def fb_delete(collection: str, doc_id: str) -> bool:
    """
    Delete a Firestore document.

    Returns ``True`` on success, ``False`` on failure.
    """
    col = get_collection(collection)
    if col is None:
        return False
    try:
        col.document(doc_id).delete()
        logger.debug("FB delete: %s/%s", collection, doc_id)
        return True
    except Exception as exc:
        logger.error("FB delete failed [%s/%s]: %s", collection, doc_id, exc)
        return False


def fb_count(collection: str) -> int | None:
    """
    Return the document count for a collection, or None if unavailable.

    Note: Uses a full stream which is expensive at scale — for production
    use Firestore aggregation queries.
    """
    col = get_collection(collection)
    if col is None:
        return None
    try:
        return sum(1 for _ in col.stream())
    except Exception as exc:
        logger.error("FB count failed [%s]: %s", collection, exc)
        return None


# ══════════════════════════════════════════════════════════
# Storage Router — Firebase-first, local fallback
# ══════════════════════════════════════════════════════════

class StorageRouter:
    """
    Smart storage router that tries Firebase first and transparently
    falls back to local JSON storage.

    Usage::

        router = StorageRouter("materials")
        doc = router.create(doc_id, payload)
    """

    def __init__(self, collection: str):
        self.collection = collection
        self._use_firebase = is_firebase_available()
        # Import here to avoid circular imports at module load
        from services.local_storage import LocalStorage
        self._local = LocalStorage(collection)

    def create(self, doc_id: str, data: dict) -> dict:
        """Create document in Firebase, fall back to local storage."""
        if self._use_firebase:
            result = fb_create(self.collection, doc_id, data)
            if result is not None:
                return result
            logger.warning("FB create failed — using local storage for %s", doc_id)
        return self._local.create(doc_id, data)

    def get(self, doc_id: str) -> dict | None:
        """Fetch document from Firebase, fall back to local."""
        if self._use_firebase:
            result = fb_get(self.collection, doc_id)
            if result is not None:
                return result
        return self._local.get(doc_id)

    def get_all(self) -> list[dict]:
        """Return all documents from Firebase or local storage."""
        if self._use_firebase:
            result = fb_get_all(self.collection)
            if result is not None:
                return result
        return self._local.get_all()

    def filter_by(self, field: str, value: Any) -> list[dict]:
        """Filter documents by field==value."""
        if self._use_firebase:
            result = fb_query(self.collection, field, value)
            if result is not None:
                return result
        return self._local.filter_by(field, value)

    def filter_by_user(self, user_id: str) -> list[dict]:
        """Shorthand for filter_by('user_id', user_id)."""
        return self.filter_by("user_id", user_id)

    def update(self, doc_id: str, data: dict) -> dict | None:
        """Update document in Firebase, fall back to local."""
        if self._use_firebase:
            result = fb_update(self.collection, doc_id, data)
            if result is not None:
                return result
        return self._local.update(doc_id, data)

    def delete(self, doc_id: str) -> bool:
        """Delete from Firebase, fall back to local."""
        if self._use_firebase:
            return fb_delete(self.collection, doc_id)
        return self._local.delete(doc_id)

    def count(self) -> int:
        """Return document count."""
        if self._use_firebase:
            result = fb_count(self.collection)
            if result is not None:
                return result
        return self._local.count()

    def exists(self, doc_id: str) -> bool:
        """Return True if document exists."""
        return self.get(doc_id) is not None
