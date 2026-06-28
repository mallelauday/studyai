import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Layers, HelpCircle, Calendar, BarChart3, Settings, X } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard', exact: true },
  { icon: Upload, label: 'Upload Materials', path: '/dashboard/upload' },
  { icon: FileText, label: 'AI Summaries', path: '/dashboard/summaries' },
  { icon: Layers, label: 'Flashcards', path: '/dashboard/flashcards' },
  { icon: HelpCircle, label: 'Quiz Center', path: '/dashboard/quizzes' },
  { icon: Calendar, label: 'Study Planner', path: '/dashboard/planner' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
];

export function Sidebar({ isOpen, onClose }) {
  return (
    <aside
      className={`
        fixed top-0 bottom-0 left-0 w-64 lg:w-72 z-50 lg:z-40
        bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border
        flex flex-col pt-6 lg:top-16 lg:h-[calc(100vh-4rem)]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Sidebar Mobile Header */}
      <div className="flex items-center justify-between px-4 pb-4 lg:hidden border-b border-gray-100 dark:border-dark-border mb-4">
        <span className="font-bold text-lg text-gray-900 dark:text-white">Menu</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-4 mb-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:block">
        Main Menu
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={onClose} // Auto-close sidebar on mobile after clicking
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-dark-border mt-auto">
        <NavLink
          to="/dashboard/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-gray-100'
            }`
          }
        >
          <Settings size={20} />
          Profile Settings
        </NavLink>
      </div>
    </aside>
  );
}
