"""
============================================================
StudyAI Backend — Test Suite: Local Storage
============================================================
Runs with:   pytest tests/test_local_storage.py -v

Uses random UUIDs for every test so reruns never collide
with leftover JSON data from previous runs.
Each test also cleans up its own created document.
"""

import pytest
import sys
import os
import uuid
import shutil
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.local_storage import LocalStorage, init_local_storage
from config import get_config

Config = get_config()


def _uid() -> str:
    """Return a fresh UUID string for each test."""
    return str(uuid.uuid4())


@pytest.fixture(scope="session", autouse=True)
def init_storage():
    """Initialise local storage once for the whole test session."""
    init_local_storage()
    yield
    # Clean up test documents that may have leaked into production storage
    # (nothing to do — we rely on per-test teardown below)


@pytest.fixture
def store():
    """Return a LocalStorage instance pointing at 'materials'."""
    return LocalStorage("materials")


@pytest.fixture
def created_doc(store):
    """
    Create a document before the test and delete it after.
    Yields the (doc_id, doc) tuple.
    """
    doc_id = _uid()
    doc = store.create(doc_id, {"name": "Fixture Doc", "user_id": "fixture-user"})
    yield doc_id, doc
    store.delete(doc_id)   # cleanup — no-op if test already deleted it


class TestLocalStorageCRUD:

    def test_create_document(self, store):
        doc_id = _uid()
        try:
            doc = store.create(doc_id, {"name": "Test Doc", "user_id": "user-1"})
            assert doc["id"] == doc_id
            assert doc["name"] == "Test Doc"
            assert "created_at" in doc
            assert "updated_at" in doc
        finally:
            store.delete(doc_id)

    def test_create_duplicate_raises(self, store):
        doc_id = _uid()
        store.create(doc_id, {"name": "Dup"})
        try:
            with pytest.raises(ValueError):
                store.create(doc_id, {"name": "Dup Again"})
        finally:
            store.delete(doc_id)

    def test_get_existing_document(self, store, created_doc):
        doc_id, _ = created_doc
        doc = store.get(doc_id)
        assert doc is not None
        assert doc["id"] == doc_id

    def test_get_nonexistent_returns_none(self, store):
        assert store.get(_uid()) is None

    def test_get_all_returns_list(self, store):
        docs = store.get_all()
        assert isinstance(docs, list)

    def test_filter_by_user(self, store):
        user_id = f"test-user-{_uid()}"
        doc_id = _uid()
        store.create(doc_id, {"user_id": user_id, "name": "U doc"})
        try:
            results = store.filter_by_user(user_id)
            assert all(d["user_id"] == user_id for d in results)
            assert len(results) >= 1
        finally:
            store.delete(doc_id)

    def test_update_document(self, store, created_doc):
        doc_id, _ = created_doc
        updated = store.update(doc_id, {"status": "published"})
        assert updated["status"] == "published"
        assert updated["id"] == doc_id

    def test_update_nonexistent_returns_none(self, store):
        assert store.update(_uid(), {"x": 1}) is None

    def test_delete_document(self, store):
        doc_id = _uid()
        store.create(doc_id, {"temp": True})
        result = store.delete(doc_id)
        assert result is True
        assert store.get(doc_id) is None

    def test_delete_nonexistent_returns_false(self, store):
        assert store.delete(_uid()) is False

    def test_exists(self, store, created_doc):
        doc_id, _ = created_doc
        assert store.exists(doc_id) is True
        assert store.exists(_uid()) is False

    def test_count(self, store):
        before = store.count()
        doc_id = _uid()
        store.create(doc_id, {})
        try:
            assert store.count() == before + 1
        finally:
            store.delete(doc_id)
