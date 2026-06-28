import { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import api from '../../services/api';

// ── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const EXT_COLORS = {
  pdf:  'bg-red-100   dark:bg-red-900/30   text-red-500',
  docx: 'bg-blue-100  dark:bg-blue-900/30  text-blue-500',
  doc:  'bg-blue-100  dark:bg-blue-900/30  text-blue-500',
  txt:  'bg-gray-100  dark:bg-gray-900/30  text-gray-500',
  md:   'bg-purple-100 dark:bg-purple-900/30 text-purple-500',
};

function extColor(ext) {
  return EXT_COLORS[ext?.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-900/30 text-gray-500';
}

// ── component ──────────────────────────────────────────────────────────────

export function UploadMaterial() {
  const [dragActive, setDragActive] = useState(false);
  const [file,       setFile]       = useState(null);
  const [status,     setStatus]     = useState('idle'); // idle | uploading | complete | error
  const [uploadError, setUploadError] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState(null); // last upload result

  // Document list state
  const [documents, setDocuments]   = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError,   setListError]   = useState('');

  // ── fetch document list ────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await api.get('/upload');
      const rawDocs = res.data?.data?.documents ?? [];
      const docs = rawDocs.map(doc => ({
        ...doc,
        document_id: doc.document_id || doc.id || doc.uuid,
      }));
      setDocuments(docs);
    } catch (err) {
      setListError(err.response?.data?.error ?? 'Failed to load your documents.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // ── drag handlers ──────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) { setFile(dropped); setStatus('idle'); setUploadError(''); }
  };

  const handleChange = (e) => {
    const picked = e.target.files?.[0];
    if (picked) { setFile(picked); setStatus('idle'); setUploadError(''); }
  };

  // ── upload handler ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const doc = res.data?.data;
      setUploadedDoc(doc);
      setStatus('complete');
      await fetchDocuments(); // refresh the list
    } catch (err) {
      const msg = err.response?.data?.error
        ?? (err.request ? 'Server unreachable. Make sure the backend is running.' : 'Upload failed.');
      setUploadError(msg);
      setStatus('error');
    }
  };

  // ── delete handler ─────────────────────────────────────────────────────
  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/upload/${docId}`);
      await fetchDocuments();
    } catch {
      // silent
    }
  };

  const reset = () => { setFile(null); setStatus('idle'); setUploadError(''); setUploadedDoc(null); };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Study Material</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Upload PDFs, DOCX, or TXT files for AI analysis.</p>
      </div>

      {/* ── Upload Zone ─────────────────────────────────────── */}
      <div className="glass-card p-8">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all ${
              dragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-300 dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-600'
            }`}
            onDragEnter={handleDrag} onDragLeave={handleDrag}
            onDragOver={handleDrag}  onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Drag &amp; Drop your files here</h3>
            <p className="text-gray-500 mb-6 max-w-md">Supported formats: PDF, DOCX, TXT, MD. Maximum file size: 16 MB.</p>
            <label className="px-6 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-dark-border cursor-pointer transition-colors">
              Browse Files
              <input type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.md" onChange={handleChange} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File preview */}
            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg/50">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">{file.name}</h4>
                <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
              </div>
              {status === 'idle' && (
                <button onClick={reset} className="text-sm text-red-500 hover:underline px-2 flex-shrink-0">Remove</button>
              )}
            </div>

            {/* Progress bar */}
            {status === 'uploading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-primary-600 dark:text-primary-400 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Uploading &amp; processing with AI…
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-primary-600 to-blue-500 animate-pulse" style={{ width: '70%' }} />
                </div>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Success */}
            {status === 'complete' && uploadedDoc && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-green-500" size={24} />
                  <p className="font-medium text-green-800 dark:text-green-400">Upload complete!</p>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1 ml-9">
                  <p><span className="font-medium">Title:</span> {uploadedDoc.title}</p>
                  <p><span className="font-medium">Words:</span> {uploadedDoc.word_count?.toLocaleString()}</p>
                  <p><span className="font-medium">Pages:</span> {uploadedDoc.page_count}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            {status === 'idle' && (
              <button
                onClick={handleUpload}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30 transition-all flex justify-center items-center gap-2"
              >
                <UploadCloud size={20} /> Start Upload &amp; Analysis
              </button>
            )}

            {(status === 'complete' || status === 'error') && (
              <button onClick={reset} className="w-full py-3 border border-gray-200 dark:border-dark-border rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                Upload Another File
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Uploaded Documents List ────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Your Documents
            {documents.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">({documents.length})</span>
            )}
          </h2>
          <button
            onClick={fetchDocuments}
            disabled={listLoading}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading documents…
          </div>
        ) : listError ? (
          <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} /> {listError}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No documents yet.</p>
            <p className="text-sm mt-1">Upload your first file above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.document_id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg/50 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${extColor(doc.extension)}`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h4>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="uppercase font-semibold">{doc.extension}</span>
                    <span>{doc.word_count?.toLocaleString()} words</span>
                    <span>{formatBytes(doc.size_bytes)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    doc.status === 'summarised' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {doc.status ?? 'processed'}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.document_id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
