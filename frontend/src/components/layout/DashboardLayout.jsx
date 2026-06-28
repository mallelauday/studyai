import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ⏳ Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 🔒 Protected route check
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Topbar */}
      <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 pt-16 relative">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile/Tablet overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
            role="button"
            aria-label="Close sidebar overlay"
          />
        )}

        {/* Page Content */}
        <main
          className="
            flex-1
            w-full
            min-h-[calc(100vh-4rem)]
            lg:pl-72
            p-4 sm:p-6 lg:p-8
            transition-all duration-300 ease-in-out
            overflow-x-auto
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}