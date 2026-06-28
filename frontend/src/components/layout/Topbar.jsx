import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle";
import { Menu, LogOut, User, Brain, Bell } from "lucide-react";

export function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-30 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-4 lg:px-6 flex items-center justify-between">
      {/* Left side: Hamburger (hidden on lg) + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-blue-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Brain size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
            Study<span className="text-primary-600 dark:text-primary-400">AI</span>
          </span>
        </Link>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications (aesthetic only) */}
        <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors">
          <Bell size={20} />
        </button>

        <ThemeToggle />

        {/* User profile dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
              aria-label="User menu"
              aria-expanded={profileDropdownOpen}
            >
              <img
                src={user.avatar || "/avatar-placeholder.png"}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-dark-border bg-white"
              />
            </button>

            {profileDropdownOpen && (
              <>
                {/* Click outside backdrop to close profile dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                
                <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-200 dark:border-dark-border z-20">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user.display_name || user.name || "Student"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/dashboard/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border"
                  >
                    <User size={16} /> Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 text-left hover:bg-red-50 dark:hover:bg-red-955/20"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
