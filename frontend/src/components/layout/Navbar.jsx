import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Sun, Moon, Brain, LogOut, User, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "../ThemeToggle";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // 🔥 FIX ADDED

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🔥 FIXED LOGOUT HANDLER
  const handleLogout = () => {
    logout();              // clear auth
    setMobileMenuOpen(false);
    navigate("/login");    // redirect immediately
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-4" : "py-6"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          className={`flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 ${
            scrolled
              ? "glass shadow-lg border border-gray-200/50 dark:border-white/10 bg-white/70 dark:bg-dark-card/70 backdrop-blur-md"
              : "bg-transparent"
          }`}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-blue-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Brain size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              Study<span className="text-primary-600 dark:text-primary-400">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#pricing">Pricing</a>
            </nav>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-4">
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Dashboard
                  </Link>

                  <div className="relative group">
                    <button className="flex items-center gap-2">
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                    </button>

                    <div className="absolute right-0 w-48 mt-2 py-2 bg-white dark:bg-dark-card rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <User size={16} /> Profile
                      </Link>

                      <button
                        onClick={handleLogout}   // 🔥 FIXED
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 text-left"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login">Log in</Link>
                  <Link to="/register">Sign up</Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-4 right-4 mt-2 p-4 glass-card"
          >
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>

                <button onClick={handleLogout} className="text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/register">Sign up</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}