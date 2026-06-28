/**
 * Register Page
 * -------------
 * Migrated from direct Firebase SDK call to Axios /api/auth/register.
 * On success: calls login(user, access_token, refresh_token) → /dashboard.
 * UI is unchanged from the original design.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  User,
} from "lucide-react";

export function Register() {
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ── 1. POST /api/auth/register via Axios ─────────────────────────
      const response = await api.post("/auth/register", {
        email,
        password,
        display_name: name,
      });
      const { data: envelope } = response;

      if (!envelope?.success) {
        setError(envelope?.error || "Registration failed. Please try again.");
        return;
      }

      // ── 2. After registration, log the user in automatically ─────────
      //   The register endpoint only creates the account, so we call login.
      const loginResponse = await api.post("/auth/login", { email, password });
      const loginEnvelope = loginResponse.data;

      if (!loginEnvelope?.success) {
        // Account created but auto-login failed — redirect to login page
        navigate("/login");
        return;
      }

      const { user, access_token, refresh_token } = loginEnvelope.data ?? {};

      if (user && access_token) {
        login(user, access_token, refresh_token || null);
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login");
      }

    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const msg    = err.response.data?.error;

        if (status === 409) {
          setError("This email is already registered. Try logging in.");
        } else if (status === 400) {
          setError(msg || "Please check your input and try again.");
        } else if (status >= 500) {
          setError("The server encountered an error. Please try again later.");
        } else {
          setError(msg || `Unexpected error (HTTP ${status}).`);
        }
      } else if (err.request) {
        setError("Unable to reach the server. Make sure the backend is running on port 5000.");
      } else {
        setError("An unexpected error occurred. Please try again.");
        console.error("[Register] Unexpected error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24 pb-12">
      <div className="glass w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Join StudyAI and supercharge your learning
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border rounded-xl"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Log in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
