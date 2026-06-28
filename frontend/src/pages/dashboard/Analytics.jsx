import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function Analytics() {
  const lineOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } }
  };

  const performanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    datasets: [
      {
        fill: true,
        label: 'Average Score (%)',
        data: [65, 72, 78, 85, 86],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const topicData = {
    labels: ['Biology', 'History', 'Physics', 'Math'],
    datasets: [
      {
        label: 'Topics Mastered',
        data: [12, 19, 3, 5],
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
      },
    ],
  };

  const completionData = {
    labels: ['Completed', 'Pending', 'Overdue'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: ['#22c55e', '#3b82f6', '#ef4444'],
        borderWidth: 0,
      }
    ]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your learning progress over time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Quiz Performance Trends</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            <Line options={lineOptions} data={performanceData} />
          </div>
        </div>

        {/* Weak/Strong Topics */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Topic Mastery</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            <Bar 
              options={{ responsive: true, plugins: { legend: { display: false } } }} 
              data={topicData} 
            />
          </div>
        </div>

        {/* Study Completion */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-around">
            <div className="w-full md:w-1/3">
              <h2 className="text-lg font-bold mb-4">Study Plan Completion</h2>
              <div className="h-[250px] flex items-center justify-center">
                <Doughnut data={completionData} options={{ cutout: '70%' }} />
              </div>
            </div>
            
            <div className="w-full md:w-1/2 space-y-6">
              <div>
                <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white">Learning Velocity</h3>
                <p className="text-sm text-gray-500 mb-2">You are studying 15% more effectively than last week. Keep it up!</p>
                <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Time Spent</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">24h 30m</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Materials Processed</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">142</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
