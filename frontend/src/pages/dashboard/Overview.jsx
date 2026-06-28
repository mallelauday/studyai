import { useState, useEffect } from 'react';
import { BookOpen, Target, Clock, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function formatDate(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

export function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    totalMaterials: 0,
    quizzesTaken: 0,
    studyStreak: '0 days',
    avgScore: '0%',
  });
  
  const [recentDocs, setRecentDocs] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch materials, quizzes, and results in parallel
        const [docsRes, quizzesRes, resultsRes] = await Promise.all([
          api.get('/upload'),
          api.get('/quiz'),
          api.get('/quiz/results'),
        ]);

        const docs = docsRes.data?.data?.documents ?? [];
        const quizzes = quizzesRes.data?.data?.quizzes ?? [];
        const results = resultsRes.data?.data?.results ?? [];

        // Calculate average score
        let scoreStr = '0%';
        if (results.length > 0) {
          const sum = results.reduce((acc, curr) => acc + (curr.score ?? curr.percentage ?? 0), 0);
          scoreStr = `${Math.round(sum / results.length)}%`;
        }

        // Calculate streak (mock/placeholder logic using login history or results if needed, but let's count unique days active in results/materials or default to a reasonable fallback)
        const uniqueDays = new Set();
        [...docs, ...results].forEach(item => {
          if (item.created_at) {
            uniqueDays.add(item.created_at.split('T')[0]);
          }
        });
        const streak = uniqueDays.size > 0 ? `${uniqueDays.size} days` : '0 days';

        setStats({
          totalMaterials: docs.length,
          quizzesTaken: results.length,
          studyStreak: streak,
          avgScore: scoreStr,
        });

        // Set recent 3 docs
        setRecentDocs(docs.slice(0, 3));

        // Aggregate weak topics from quiz results
        const topicMap = {};
        results.forEach(r => {
          (r.weak_topics ?? []).forEach(topicObj => {
            const topicName = typeof topicObj === 'string' ? topicObj : topicObj.topic;
            if (topicName) {
              topicMap[topicName] = (topicMap[topicName] || 0) + 1;
            }
          });
        });
        const sortedTopics = Object.keys(topicMap).sort((a, b) => topicMap[b] - topicMap[a]);
        setWeakTopics(sortedTopics.slice(0, 3));

      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statItems = [
    { title: 'Total Materials', value: stats.totalMaterials, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
    { title: 'Quizzes Taken', value: stats.quizzesTaken, icon: Target, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Study Streak', value: stats.studyStreak, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Avg. Score', value: stats.avgScore, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading overview dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.display_name || user?.name || 'Student'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Here's a summary of your study progress.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat, i) => (
          <div key={i} className="glass-card p-6 flex items-start gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity and Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Recent Materials</h3>
          {recentDocs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              No materials uploaded yet.
              <button
                onClick={() => navigate('/dashboard/upload')}
                className="block mx-auto mt-2 text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Upload now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentDocs.map((doc) => (
                <div key={doc.document_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{doc.title}</h4>
                      <p className="text-xs text-gray-500">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/summaries')}
                    className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline flex-shrink-0 ml-2"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Weak Topics to Review</h3>
          {weakTopics.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              No weak topics identified yet. Complete quizzes to get study recommendations.
              <button
                onClick={() => navigate('/dashboard/quizzes')}
                className="block mx-auto mt-2 text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Take a Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {weakTopics.map((topic, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-orange-500" />
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{topic}</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/quizzes')}
                    className="text-xs px-3 py-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full hover:bg-gray-50 dark:hover:bg-dark-border shadow-sm"
                  >
                    Practice
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
