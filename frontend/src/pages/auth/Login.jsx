/**
 * Login Page
 * ----------
 * Uses the centralized Axios apiClient (services/api.js).
 * On success: calls login(user, access_token, refresh_token) → redirects to /dashboard.
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
} from "lucide-react";

export function Login() {
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
    setIsSubmitting(true);

    try {
      // ── 1. POST /api/auth/login via Axios ───────────────────────────
      const response = await api.post("/auth/login", { email, password });
      const { data: envelope } = response;

      // ── 2. Validate success envelope ────────────────────────────────
      if (!envelope?.success) {
        setError(envelope?.error || "Login failed. Please try again.");
        return;
      }

      const payload = envelope.data;
      const { user, access_token, refresh_token } = payload ?? {};

      if (!user || !access_token) {
        setError("The server returned an incomplete response. Please try again.");
        return;
      }

      // ── 3. Persist session + redirect ───────────────────────────────
      login(user, access_token, refresh_token || null);
      navigate("/dashboard", { replace: true });

    } catch (err) {
      // Axios wraps HTTP errors in err.response
      if (err.response) {
        const status = err.response.status;
        const msg    = err.response.data?.error;

        if (status === 401) {
          setError("Invalid email or password. Please check your credentials.");
        } else if (status === 400) {
          setError(msg || "Please check your input and try again.");
        } else if (status >= 500) {
          setError("The server encountered an error. Please try again later.");
        } else {
          setError(msg || `Unexpected error (HTTP ${status}).`);
        }
      } else if (err.request) {
        // Request was sent but no response received — network/CORS issue
        setError("Unable to reach the server. Make sure the backend is running on port 5000.");
      } else {
        setError("An unexpected error occurred. Please try again.");
        console.error("[Login] Unexpected error:", err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24 pb-12">
      <div className="glass w-full max-w-md p-8 relative overflow-hidden">

        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your details to access your dashboard
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-2">
                <label htmlFor="login-password" className="text-sm font-medium">
                  Password
                </label>
                <Link to="/forgot-password" className="text-primary-600 text-sm hover:underline">
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border rounded-xl"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>

          </form>

          {/* Register link */}
          <div className="mt-8 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Register
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
