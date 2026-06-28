import { Calendar as CalendarIcon, CheckCircle, Circle, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../services/api';

export function StudyPlanner() {
  const [studyPlan, setStudyPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [difficulty, setDifficulty] = useState('medium');

  // Fetch plan on mount
  const fetchPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getStudyPlan();
      if (res.data?.success) {
        setStudyPlan(res.data.plan || []);
      } else {
        setError('Failed to retrieve study plan.');
      }
    } catch (err) {
      console.error('Failed to load study plan', err);
      setError('Could not retrieve study plan from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  // Generate study plan
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subject || !examDate) {
      setError('Please fill out all fields.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      // ── 1. Call POST /api/study-plan/generate ───────────────────
      const res = await api.generateStudyPlan({
        subject,
        exam_date: examDate,
        difficulty
      });

      if (!res.data?.success) {
        setError(res.data?.error || 'Generation failed.');
        setIsGenerating(false);
        return;
      }

      // ── 2. CRITICAL FIX: Fetch-after-write pattern ──────────────────
      const planRes = await api.getStudyPlan();
      if (planRes.data?.success) {
        setStudyPlan(planRes.data.plan || []);
        setSuccess('Study plan generated and saved successfully!');
      } else {
        setError('Failed to fetch the newly generated plan.');
      }

    } catch (err) {
      console.error('Planner generation failed:', err);
      setError(err.response?.data?.error || 'Failed to generate study plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle task completed state
  const handleToggleTask = async (dayDate, taskIndex) => {
    // Map and toggle locally
    const updatedPlan = studyPlan.map(day => {
      if (day.date === dayDate) {
        const updatedTasks = [...day.tasks];
        // If daily tasks is represented as object we toggle, but here day.completed is for the day,
        // or we check if there's completed tasks array.
        // Wait, the schema is:
        // { "date": "YYYY-MM-DD", "tasks": ["string"], "completed": false }
        // The prompt says completed is on the day object itself. Let's toggle the completed field
        // or check how tasks completion is tracked.
        // If completed is a boolean on the day, we can set day.completed = !day.completed.
        // Let's toggle the entire day's completion, or if tasks can be checked, we can toggle the day's completion when all tasks are checked.
        // Let's toggle the day's completion when the user clicks the checkbox for that day!
        return { ...day, completed: !day.completed };
      }
      return day;
    });

    setStudyPlan(updatedPlan);

    // Sync to backend (Backend as source of truth)
    try {
      await api.updateStudyPlan(updatedPlan);
    } catch (err) {
      console.error('Failed to sync study plan task toggle:', err);
    }
  };

  // Export PDF study plan
  const handleExportPDF = async () => {
    try {
      const res = await api.exportPDF("study-plan");
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "study-plan.pdf";
      a.click();
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to download PDF export.');
    }
  };

  // Reset current study plan
  const handleResetPlan = () => {
    setStudyPlan([]);
    setSuccess('');
    setError('');
  };

  // Calculate statistics
  const totalDays = studyPlan.length;
  const completedDays = studyPlan.filter(d => d.completed).length;
  const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading study planner…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Planner</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your AI-generated daily study schedule.</p>
        </div>
        {studyPlan.length > 0 && (
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-600 to-blue-500 hover:from-primary-700 hover:to-blue-600 text-white rounded-xl shadow-md font-medium text-sm transition-all"
          >
            Export PDF Schedule
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="alert" className="flex items-start gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {studyPlan.length === 0 ? (
        /* Empty State & Generation CTA Form */
        <div className="glass-card p-8 max-w-2xl mx-auto space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-2xl flex items-center justify-center">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Your Study Plan</h2>
            <p className="text-gray-500 text-sm mt-1">Select a subject and an exam date to generate a day-by-day revision calendar.</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 text-left max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Subject / Exam Name</label>
              <input 
                type="text" 
                placeholder="e.g. AP Biology, Calculus Final" 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Target Exam Date</label>
              <input 
                type="date" 
                value={examDate} 
                onChange={e => setExamDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Difficulty Level</label>
              <select 
                value={difficulty} 
                onChange={e => setDifficulty(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
              >
                <option value="easy">Easy (light study load)</option>
                <option value="medium">Medium (standard plan)</option>
                <option value="hard">Hard (intensive prep)</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-500 hover:from-primary-700 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl font-medium shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating Plan…
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Plan
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Calendar View & Progress Panel */
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Col: Study Days */}
          <div className="lg:col-span-2 space-y-4">
            {studyPlan.map((day, dayIdx) => (
              <div 
                key={day.date} 
                className={`glass-card p-6 border transition-all ${
                  day.completed 
                    ? 'bg-gray-50 border-gray-200 dark:bg-dark-bg dark:border-dark-border opacity-75' 
                    : 'bg-white border-primary-100 dark:bg-dark-card dark:border-primary-900/10 shadow-sm hover:border-primary-300'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-bold flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleTask(day.date, 0)} 
                      className="focus:outline-none"
                    >
                      {day.completed ? (
                        <CheckCircle size={22} className="text-green-500" />
                      ) : (
                        <Circle size={22} className="text-gray-300 dark:text-gray-600 hover:text-primary-500 transition-colors" />
                      )}
                    </button>
                    <span className={day.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}>
                      Day {dayIdx + 1}: {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </h3>
                </div>

                <div className="space-y-2 pl-8">
                  {day.tasks.map((task, taskIdx) => (
                    <div 
                      key={taskIdx}
                      className={`text-sm py-1 ${day.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right Col: Progress & Settings */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Plan Progress</h3>
              <div className="flex items-center justify-center relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-dark-border" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 40}`} 
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                    className="text-primary-500 transition-all duration-1000 ease-out" 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {completedDays} of {totalDays} days completed
              </p>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Planner Options</h3>
              <button 
                onClick={handleResetPlan}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                <RefreshCw size={16} />
                Generate New Plan
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
