import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Sparkles, Check, Loader2, AlertCircle, BookOpen, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useDocuments } from '../../hooks/useDocuments';

// ── helpers ───────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildMarkdown(summaryData) {
  if (!summaryData) return '';
  if (typeof summaryData === 'string') return summaryData;
  const parts = [];
  if (summaryData.topic_overview)  parts.push(`## Overview\n${summaryData.topic_overview}`);
  if (summaryData.key_concepts?.length) {
    parts.push('## Key Concepts');
    summaryData.key_concepts.forEach(c => {
      if (typeof c === 'string') parts.push(`- ${c}`);
      else if (c.concept) parts.push(`- **${c.concept}**: ${c.explanation ?? ''}`);
    });
  }
  if (summaryData.definitions?.length) {
    parts.push('## Definitions');
    summaryData.definitions.forEach(d => {
      if (typeof d === 'string') parts.push(`- ${d}`);
      else if (d.term) parts.push(`- **${d.term}**: ${d.definition ?? ''}`);
    });
  }
  if (summaryData.revision_notes) parts.push(`> **Revision Note**: ${summaryData.revision_notes}`);
  return parts.join('\n\n');
}

// ── component ─────────────────────────────────────────────

export function AISummaries() {
  const { documents, loading: docsLoading } = useDocuments();

  const [selectedDocId,  setSelectedDocId]  = useState('');
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [generateError,  setGenerateError]  = useState('');
  const [activeSummary,  setActiveSummary]  = useState(null);  // currently displayed summary
  const [markdownText,   setMarkdownText]   = useState('');
  const [copied,         setCopied]         = useState(false);

  // Past summaries list
  const [summaries,      setSummaries]      = useState([]);
  const [listLoading,    setListLoading]    = useState(true);
  const [listError,      setListError]      = useState('');

  // ── fetch past summaries ───────────────────────────────
  const fetchSummaries = async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await api.get('/summary');
      setSummaries(res.data?.data?.summaries ?? []);
    } catch (err) {
      setListError(err.response?.data?.error ?? 'Failed to load summaries.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, []);

  // ── generate summary ───────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setGenerateError('');
    setActiveSummary(null);
    setMarkdownText('');

    try {
      const res = await api.post('/summary', { document_id: selectedDocId });
      const payload = res.data?.data;
      const summaryData = payload?.summary;
      setActiveSummary(payload);
      setMarkdownText(buildMarkdown(summaryData));
      await fetchSummaries(); // refresh list
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error;
      if (status === 503) setGenerateError('AI service is temporarily unavailable. Please try again in a moment.');
      else if (status === 422) setGenerateError('Document content is too short to summarise.');
      else setGenerateError(msg ?? 'Failed to generate summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── view a past summary ────────────────────────────────
  const handleViewSummary = (s) => {
    setActiveSummary(s);
    setMarkdownText(buildMarkdown(s.summary ?? s));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── render ─────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Summaries</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate concise summaries from your uploaded materials.</p>
        </div>
      </div>

      {/* ── Generator card ─────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {docsLoading ? (
            <div className="flex-1 w-full flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading your documents…
            </div>
          ) : (
            <select
              className="flex-1 w-full bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
            >
              <option value="">— Select a document —</option>
              {documents.map(doc => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.title} ({doc.extension?.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedDocId}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-500 hover:from-primary-700 hover:to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <><Loader2 size={18} className="animate-spin" /> Generating…</>
              : <><Sparkles size={18} /> Generate Summary</>
            }
          </button>
        </div>

        {generateError && (
          <div role="alert" className="mt-4 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {generateError}
          </div>
        )}
      </div>

      {/* ── Generated / selected summary ───────────────── */}
      {markdownText && (
        <div className="glass-card overflow-hidden">
          <div className="bg-gray-50 dark:bg-dark-border/30 px-6 py-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              {activeSummary?.document_title ?? 'Generated Summary'}
              {activeSummary?.cached && (
                <span className="text-xs font-normal text-gray-500 ml-1">(cached)</span>
              )}
            </h3>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-border rounded-lg transition-colors flex items-center gap-1 text-sm"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-8 prose prose-blue dark:prose-invert max-w-none">
            <ReactMarkdown>{markdownText}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* ── Past summaries list ─────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Your Summaries
            {summaries.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({summaries.length})</span>}
          </h2>
          <button
            onClick={fetchSummaries}
            disabled={listLoading}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading summaries…
          </div>
        ) : listError ? (
          <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} /> {listError}
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No summaries yet.</p>
            <p className="text-sm mt-1">Select a document above and generate your first summary.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map(s => (
              <button
                key={s.id ?? s.summary_id}
                onClick={() => handleViewSummary(s)}
                className="w-full text-left flex items-center gap-4 p-4 border border-gray-200 dark:border-dark-border rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors"
              >
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">{s.document_title ?? 'Untitled'}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(s.created_at)}</p>
                </div>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium flex-shrink-0">View →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
