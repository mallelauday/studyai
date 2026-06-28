/**
 * useDocuments — Shared hook for fetching the user's uploaded documents.
 *
 * Returns:
 *   documents  — array of document objects from GET /api/upload
 *   loading    — true while fetching
 *   error      — string error message or null
 *   refresh()  — manually re-fetch (call after a new upload)
 *
 * Each document object:
 *   { document_id, title, extension, word_count, size_bytes, created_at, status, tags, preview }
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/upload');
      // Response shape: { success, data: { documents: [...], count: N } }
      const rawDocs = res.data?.data?.documents ?? [];
      const docs = rawDocs.map(doc => ({
        ...doc,
        document_id: doc.document_id || doc.id || doc.uuid,
      }));
      setDocuments(docs);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to load documents.';
      setError(msg);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refresh: fetchDocuments };
}
