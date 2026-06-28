import { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle, Clock, AlertCircle, CheckCircle2,
  Loader2, Sparkles, BookOpen, Target,
} from 'lucide-react';
import api from '../../services/api';
import { useDocuments } from '../../hooks/useDocuments';

// ── helpers ───────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const DIFFICULTY_COLORS = {
  easy:   'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  medium: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  hard:   'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
};

// ── component ─────────────────────────────────────────────

export function Quizzes() {
  const { documents, loading: docsLoading } = useDocuments();

  // Existing quizzes list
  const [quizzes,      setQuizzes]      = useState([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [listError,    setListError]    = useState('');

  // Generator controls
  const [selectedDocId, setSelectedDocId] = useState('');
  const [difficulty,    setDifficulty]    = useState('medium');
  const [count,         setCount]         = useState(10);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [genError,      setGenError]      = useState('');
  const [showGenerator, setShowGenerator] = useState(false);

  // Active quiz session
  const [activeQuiz,    setActiveQuiz]    = useState(null);  // full quiz doc with questions
  const [currentQ,      setCurrentQ]      = useState(0);
  const [answers,       setAnswers]       = useState({});    // { question_id: selected_option_index }
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [result,        setResult]        = useState(null);  // graded result from backend
  const [submitError,   setSubmitError]   = useState('');
  const [isSubmitted,   setIsSubmitted]   = useState(false);

  // ── fetch existing quizzes ─────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await api.get('/quiz');
      setQuizzes(res.data?.data?.quizzes ?? []);
    } catch (err) {
      setListError(err.response?.data?.error ?? 'Failed to load quizzes.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  // ── countdown timer ────────────────────────────────────
  useEffect(() => {
    if (!activeQuiz || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, isSubmitted, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && activeQuiz && !isSubmitted && !isSubmitting) {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── generate a new quiz ────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    setGenError('');
    try {
      const res = await api.post('/quiz/generate', {
        document_id: selectedDocId,
        count:       Number(count),
        difficulty,
        quiz_type:   'mcq',
      });
      const payload = res.data?.data;
      // Load questions and start session immediately
      startSession({
        id:             payload.quiz_id,
        document_title: payload.document_title,
        questions:      payload.questions,
        difficulty,
        count:          payload.count,
      });
      await fetchQuizzes();
      setShowGenerator(false);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error;
      if (status === 503) setGenError('AI service temporarily unavailable. Please try again.');
      else if (status === 422) setGenError('Document content is too short to generate a quiz.');
      else setGenError(msg ?? 'Failed to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── open an existing quiz ──────────────────────────────
  const openExistingQuiz = async (quizId) => {
    try {
      const res = await api.get(`/quiz/${quizId}`);
      const q = res.data?.data;
      if (!q?.questions?.length) return;
      startSession(q);
    } catch (err) {
      setListError(err.response?.data?.error ?? 'Failed to load quiz.');
    }
  };

  const startSession = (quizDoc) => {
    setActiveQuiz(quizDoc);
    setCurrentQ(0);
    setAnswers({});
    setTimeLeft(quizDoc.questions.length * 60); // 1 min per question
    setIsSubmitted(false);
    setResult(null);
    setSubmitError('');
  };

  // ── select an answer ───────────────────────────────────
  const handleSelect = (questionId, optionIdx) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
  };

  // ── submit quiz ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeQuiz || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    const formattedAnswers = activeQuiz.questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] !== undefined
        ? q.options?.[answers[q.id]]     // convert index → option string
        : '',
    }));

    try {
      const res = await api.post('/quiz/submit', {
        quiz_id: activeQuiz.id ?? activeQuiz.quiz_id,
        answers: formattedAnswers,
      });
      setResult(res.data?.data);
      setIsSubmitted(true);
      await fetchQuizzes();
    } catch (err) {
      setSubmitError(err.response?.data?.error ?? 'Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── render: active quiz session ────────────────────────
  if (activeQuiz) {
    const q     = activeQuiz.questions[currentQ];
    const totalQ = activeQuiz.questions.length;

    return (
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="glass-card p-4 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">{activeQuiz.document_title ?? 'Quiz'}</h2>
            <p className="text-sm text-gray-500">Question {currentQ + 1} of {totalQ}</p>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-2 rounded-lg ${
            timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300'
          }`}>
            <Clock size={20} /> {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[activeQuiz.difficulty] ?? ''}`}>
              {activeQuiz.difficulty}
            </span>
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-6">{q.question ?? q.q}</h3>

          <div className="space-y-3">
            {(q.options ?? []).map((opt, idx) => {
              const isSelected = answers[q.id] === idx;
              const isCorrect  = isSubmitted && (typeof q.correct_answer === 'string'
                ? opt === q.correct_answer
                : idx === q.correct_answer || idx === q.correct);
              const isWrong    = isSubmitted && isSelected && !isCorrect;

              let cls = 'bg-gray-50 dark:bg-dark-border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
              if (isSelected && !isSubmitted) cls = 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 ring-1 ring-primary-500';
              if (isCorrect) cls = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300';
              if (isWrong)   cls = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300';

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(q.id, idx)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${cls}`}
                >
                  <span>{opt}</span>
                  {isCorrect && <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />}
                  {isWrong   && <AlertCircle  size={20} className="text-red-500   flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {isSubmitted && q.explanation && (
            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
                <HelpCircle size={18} /> Explanation
              </h4>
              <p className="text-sm text-blue-900 dark:text-blue-200">{q.explanation}</p>
            </div>
          )}

          {submitError && (
            <div role="alert" className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {submitError}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQ(i => Math.max(0, i - 1))}
            disabled={currentQ === 0}
            className="px-6 py-2 border border-gray-200 dark:border-dark-border rounded-lg disabled:opacity-50 font-medium bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-border"
          >
            Previous
          </button>

          {!isSubmitted && currentQ === totalQ - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium shadow-lg shadow-green-500/30 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Grading…</> : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ(i => Math.min(totalQ - 1, i + 1))}
              disabled={currentQ === totalQ - 1}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          )}
        </div>

        {/* Result Modal */}
        {isSubmitted && result && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="glass-card w-full max-w-sm p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-500' : 'bg-red-100 dark:bg-red-900/30 text-red-500'
              }`}>
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-1">Quiz Complete!</h2>
              <p className="text-4xl font-black text-primary-600 dark:text-primary-400 my-3">{result.grade ?? `${result.score?.toFixed(0)}%`}</p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {result.correct} correct out of {result.total_questions} questions
              </p>
              <p className={`text-sm font-medium mb-6 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                {result.performance ?? (result.passed ? 'Passed! 🎉' : 'Keep Practising')}
              </p>

              {result.weak_topics?.length > 0 && (
                <div className="mb-6 text-left p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1">
                    <Target size={14} /> Weak topics to review:
                  </p>
                  <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                    {result.weak_topics.slice(0, 3).map((t, i) => (
                      <li key={i}>• {t.topic ?? t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button onClick={() => setActiveQuiz(null)} className="px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-border">
                  Back to Quizzes
                </button>
                <button onClick={() => setIsSubmitted(false)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                  Review Answers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── render: quiz list + generator ─────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Center</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Test your knowledge with AI-generated quizzes.</p>
        </div>
        <button
          onClick={() => setShowGenerator(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors text-sm shadow-lg shadow-primary-500/20"
        >
          <Sparkles size={16} /> New Quiz
        </button>
      </div>

      {/* Generator */}
      {showGenerator && (
        <div className="glass-card p-6 border border-primary-200 dark:border-primary-800/50 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Generate a New Quiz</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {docsLoading ? (
              <div className="sm:col-span-3 flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading documents…
              </div>
            ) : (
              <>
                <select
                  className="sm:col-span-1 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                >
                  <option value="">— Select document —</option>
                  {documents.map(d => (
                    <option key={d.document_id} value={d.document_id}>{d.title}</option>
                  ))}
                </select>
                <select
                  className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <select
                  className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                >
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </>
            )}
          </div>
          {genError && (
            <div role="alert" className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {genError}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedDocId}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-500 hover:from-primary-700 hover:to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Generating…</> : <><Sparkles size={18} /> Generate Quiz</>}
          </button>
        </div>
      )}

      {/* Quiz list */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Your Quizzes
          {quizzes.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({quizzes.length})</span>}
        </h2>

        {listLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading quizzes…
          </div>
        ) : listError ? (
          <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} /> {listError}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No quizzes yet.</p>
            <p className="text-sm mt-1">Click "New Quiz" above to generate your first quiz from a document.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {quizzes.map(q => (
              <div key={q.quiz_id} className={`glass-card p-6 border-t-4 ${
                q.difficulty === 'easy' ? 'border-t-green-500'
                : q.difficulty === 'hard' ? 'border-t-red-500'
                : 'border-t-primary-500'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug flex-1 mr-2 truncate">
                    {q.document_title ?? 'Untitled'}
                  </h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${DIFFICULTY_COLORS[q.difficulty] ?? ''}`}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{formatDate(q.created_at)}</p>
                <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><HelpCircle size={14} /> {q.count} Questions</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    q.status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>{q.status ?? 'active'}</span>
                </div>
                <button
                  onClick={() => openExistingQuiz(q.quiz_id)}
                  className="w-full py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-sm"
                >
                  {q.status === 'completed' ? 'Retake Quiz' : 'Start Quiz'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
