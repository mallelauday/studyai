import { useState, useEffect } from 'react';
import { Layers, ChevronLeft, ChevronRight, Shuffle, CheckCircle2, Loader2, AlertCircle, BookOpen, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useDocuments } from '../../hooks/useDocuments';

// ── component ─────────────────────────────────────────────

export function Flashcards() {
  const { documents, loading: docsLoading } = useDocuments();

  // Flashcard sets list (user's existing sets)
  const [sets,        setSets]        = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError,   setSetsError]   = useState('');

  // Active card session
  const [cards,        setCards]        = useState([]);
  const [activeSetId,  setActiveSetId]  = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [masteredIds,  setMasteredIds]  = useState(new Set());

  // Generator controls
  const [selectedDocId,   setSelectedDocId]   = useState('');
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [generateError,   setGenerateError]   = useState('');

  // ── load existing sets ─────────────────────────────────
  const fetchSets = async () => {
    setSetsLoading(true);
    setSetsError('');
    try {
      const res = await api.get('/flashcards');
      setSets(res.data?.data?.flashcard_sets ?? []);
    } catch (err) {
      setSetsError(err.response?.data?.error ?? 'Failed to load flashcard sets.');
    } finally {
      setSetsLoading(false);
    }
  };

  useEffect(() => { fetchSets(); }, []);

  // ── open a set (load full cards) ───────────────────────
  const openSet = async (setId) => {
    try {
      const res = await api.get(`/flashcards/${setId}`);
      const setDoc = res.data?.data;
      const rawCards = setDoc?.cards ?? [];
      setCards(rawCards);
      setActiveSetId(setId);
      setMasteredIds(new Set(rawCards.filter(c => c.mastered).map(c => String(c.id))));
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      setSetsError(err.response?.data?.error ?? 'Failed to load flashcards.');
    }
  };

  // ── generate new set ───────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setGenerateError('');
    try {
      const res = await api.post('/flashcards', { document_id: selectedDocId, count: 20 });
      const payload = res.data?.data;
      const rawCards = payload?.cards ?? [];
      setCards(rawCards);
      setActiveSetId(payload?.flashcard_set_id ?? null);
      setMasteredIds(new Set(rawCards.filter(c => c.mastered).map(c => String(c.id))));
      setCurrentIndex(0);
      setIsFlipped(false);
      await fetchSets();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error;
      if (status === 503) setGenerateError('AI service temporarily unavailable. Please try again.');
      else if (status === 422) setGenerateError('Document content is too short to generate flashcards.');
      else setGenerateError(msg ?? 'Failed to generate flashcards.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── card navigation ────────────────────────────────────
  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i + 1) % cards.length), 150);
  };
  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => (i - 1 + cards.length) % cards.length), 150);
  };
  const shuffleCards = () => {
    setIsFlipped(false);
    setTimeout(() => { setCards([...cards].sort(() => Math.random() - 0.5)); setCurrentIndex(0); }, 150);
  };

  // ── mark mastered ──────────────────────────────────────
  const toggleMastered = async () => {
    if (!activeSetId || cards.length === 0) return;
    const card = cards[currentIndex];
    const cardId = String(card.id);
    const nowMastered = !masteredIds.has(cardId);

    const newSet = new Set(masteredIds);
    nowMastered ? newSet.add(cardId) : newSet.delete(cardId);
    setMasteredIds(newSet);

    try {
      await api.patch(`/flashcards/${activeSetId}/master`, {
        card_ids: [card.id],
        mastered: nowMastered,
      });
    } catch {
      // revert optimistic update
      setMasteredIds(masteredIds);
    }
  };

  const activeCard = cards[currentIndex];
  const isCurrentMastered = activeCard ? masteredIds.has(String(activeCard.id)) : false;

  // ── render: active card session ────────────────────────
  if (cards.length > 0 && activeSetId) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcard Generator</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Master your topics with interactive flashcards.</p>
          </div>
          <button onClick={() => { setCards([]); setActiveSetId(null); }} className="text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium">
            ← Back to sets
          </button>
        </div>

        <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
          <span className="text-sm text-gray-500 font-medium">Card {currentIndex + 1} of {cards.length}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">{masteredIds.size} mastered</span>
            <button onClick={shuffleCards} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-medium transition-colors">
              <Shuffle size={16} /> Shuffle
            </button>
          </div>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 h-96 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 backface-hidden glass-card flex flex-col justify-center items-center p-8 text-center bg-white dark:bg-dark-card">
              <div className="absolute top-4 left-4 right-4 flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>{activeCard?.topic ?? ''}</span>
                <span className={
                  activeCard?.difficulty === 'easy'   ? 'text-green-500'
                  : activeCard?.difficulty === 'hard' ? 'text-red-500'
                  : 'text-orange-500'
                }>{activeCard?.difficulty ?? ''}</span>
              </div>
              <h2 className="text-3xl font-medium text-gray-900 dark:text-white leading-tight">
                {activeCard?.question ?? activeCard?.q ?? ''}
              </h2>
              <div className="absolute bottom-4 flex items-center gap-2 text-gray-400 text-sm">
                <Layers size={16} /> Click to flip
              </div>
            </div>
            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card flex flex-col justify-center items-center p-8 text-center bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30">
              <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 leading-tight">
                {activeCard?.answer ?? activeCard?.a ?? ''}
              </h2>
              {activeCard?.explanation && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-sm">{activeCard.explanation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center pt-4">
          <button onClick={prevCard} className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors text-gray-600 dark:text-gray-300 shadow-sm">
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={toggleMastered}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl shadow-lg transition-all ${
              isCurrentMastered
                ? 'bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'
            }`}
          >
            <CheckCircle2 size={20} />
            {isCurrentMastered ? 'Mastered ✓' : 'Mark as Mastered'}
          </button>
          <button onClick={nextCard} className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors text-gray-600 dark:text-gray-300 shadow-sm">
            <ChevronRight size={24} />
          </button>
        </div>

        <style>{`
          .perspective-1000 { perspective: 1000px; }
          .transform-style-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
        `}</style>
      </div>
    );
  }

  // ── render: sets list / generator ─────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcard Generator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Master your topics with interactive flashcards.</p>
      </div>

      {/* Generator */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Generate New Flashcard Set</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          {docsLoading ? (
            <div className="flex-1 flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading documents…
            </div>
          ) : (
            <select
              className="flex-1 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
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
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-500 hover:from-primary-700 hover:to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Generating…</> : <><Sparkles size={18} /> Generate</>}
          </button>
        </div>
        {generateError && (
          <div role="alert" className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {generateError}
          </div>
        )}
      </div>

      {/* Existing sets */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Your Flashcard Sets
          {sets.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({sets.length})</span>}
        </h2>

        {setsLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading flashcard sets…
          </div>
        ) : setsError ? (
          <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} /> {setsError}
          </div>
        ) : sets.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No flashcard sets yet.</p>
            <p className="text-sm mt-1">Select a document above and generate your first set.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {sets.map(s => (
              <button
                key={s.flashcard_set_id}
                onClick={() => openSet(s.flashcard_set_id)}
                className="text-left p-4 border border-gray-200 dark:border-dark-border rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{s.document_title ?? 'Untitled'}</h3>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>{s.total_cards} cards</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{s.mastered_count ?? 0} mastered</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${s.total_cards ? Math.round((s.mastered_count ?? 0) / s.total_cards * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">Study Now →</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
