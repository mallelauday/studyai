/**
 * ============================================================
 * StudyAI Frontend — AuthContext (JWT Edition)
 * ============================================================
 *
 * What changed from the previous version
 * ---------------------------------------
 *  - Stores TWO tokens: access_token (15 min) + refresh_token (7 days)
 *  - Exposes `role` derived from the user object
 *  - Auto-logout: reads `exp` from the access token and sets a
 *    setTimeout that calls logout() when the token expires
 *  - logout() calls the backend /auth/logout endpoint, then clears
 *    storage and redirects (via window.location for safety)
 *  - setSession() kept as a backward-compat alias for login()
 *
 * Storage keys  (must match services/api.js tokenStore)
 * ------------------------------------------------------
 *  studyai_user           – JSON user object
 *  studyai_access_token   – short-lived JWT
 *  studyai_refresh_token  – long-lived JWT
 *
 * Context value
 * -------------
 *  { user, accessToken, refreshToken, loading,
 *    isAuthenticated, role,
 *    login, logout, setSession }
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api, { tokenStore } from "../services/api";

// ── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext(null);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * Returns expiry in Unix milliseconds, or 0 on failure.
 */
function getTokenExpMs(token) {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = JSON.parse(atob(base64Payload));
    return (decoded.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

/**
 * Decode the user-facing claims from an access token without verification.
 * Returns { uid, email, role, display_name } or null.
 */
function claimsFromToken(token) {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = JSON.parse(atob(base64Payload));
    return {
      uid:          decoded.sub  || "",
      email:        decoded.email || "",
      role:         decoded.role  || "student",
      display_name: decoded.name  || "",
    };
  } catch {
    return null;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessToken]  = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading,      setLoading]      = useState(true);

  // Ref to the auto-logout timer so we can cancel it on re-login
  const logoutTimerRef = useRef(null);

  // ── Auto-logout scheduler ──────────────────────────────────────────────────

  /**
   * Schedule an automatic logout exactly when the access token expires.
   * Clears any previously scheduled timer first.
   */
  const scheduleAutoLogout = useCallback((token) => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (!token) return;

    const expMs     = getTokenExpMs(token);
    const nowMs     = Date.now();
    const delayMs   = expMs - nowMs;

    if (delayMs <= 0) {
      // Already expired — log out immediately
      console.warn("[AuthContext] Access token already expired on mount.");
      // Use setTimeout(0) so we don't call logout() during render
      logoutTimerRef.current = setTimeout(() => logout(), 0);
      return;
    }

    console.info(
      `[AuthContext] Auto-logout scheduled in ${Math.round(delayMs / 1000)}s`
    );
    logoutTimerRef.current = setTimeout(() => {
      console.warn("[AuthContext] Access token expired — logging out.");
      logout();
    }, delayMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hydrate from localStorage on first mount ───────────────────────────────

  useEffect(() => {
    try {
      const storedUser    = localStorage.getItem("studyai_user");
      const storedAccess  = tokenStore.getAccess();
      const storedRefresh = tokenStore.getRefresh();

      if (storedUser && storedAccess) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);
        scheduleAutoLogout(storedAccess);
      }
    } catch (err) {
      console.warn("[AuthContext] Hydration failed — clearing storage:", err);
      tokenStore.clearAll();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── login() ───────────────────────────────────────────────────────────────

  /**
   * Persist a successful login session.
   *
   * @param {object} userData      – User object from /api/auth/login response
   * @param {string} newAccessToken  – Flask access JWT
   * @param {string} newRefreshToken – Flask refresh JWT
   */
  const login = useCallback(
    (userData, newAccessToken, newRefreshToken) => {
      if (!userData || !newAccessToken) {
        console.error("[AuthContext] login() called with missing userData or token.");
        return;
      }

      const normalized = { ...userData };
      if (normalized.display_name && !normalized.name) {
        normalized.name = normalized.display_name;
      }
      if (normalized.avatar_url && !normalized.avatar) {
        normalized.avatar = normalized.avatar_url;
      }

      setUser(normalized);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken || null);

      tokenStore.setAccess(newAccessToken);
      if (newRefreshToken) tokenStore.setRefresh(newRefreshToken);
      tokenStore.setUser(normalized);

      scheduleAutoLogout(newAccessToken);
    },
    [scheduleAutoLogout]
  );

  // ── setSession() — backward-compat alias ──────────────────────────────────

  /**
   * @param {{ user: object, access_token: string, refresh_token?: string }} session
   */
  const setSession = useCallback(
    ({ user: u, access_token: at, refresh_token: rt, token }) => {
      // `token` is the old single-token key — support it for legacy callers
      login(u, at || token, rt);
    },
    [login]
  );

  // ── updateUser() ──────────────────────────────────────────────────────────

  const updateUser = useCallback((updatedUserData) => {
    if (!updatedUserData) return;

    const normalized = { ...updatedUserData };
    if (normalized.display_name && !normalized.name) {
      normalized.name = normalized.display_name;
    }
    if (normalized.avatar_url && !normalized.avatar) {
      normalized.avatar = normalized.avatar_url;
    }

    setUser(normalized);
    tokenStore.setUser(normalized);
  }, []);

  // ── logout() ──────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    // Cancel the auto-logout timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    // Best-effort server-side revocation (don't block on failure)
    try {
      if (accessToken) {
        await api.post("/auth/logout");
      }
    } catch {
      // Silent — token may already be expired
    }

    // Clear all state + storage
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    tokenStore.clearAll();

    // Hard redirect so every component unmounts cleanly
    window.location.href = "/login";
  }, [accessToken]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    // Derived
    isAuthenticated: !!user && !!accessToken,
    role:            user?.role || "student",
    // Actions
    login,
    logout,
    updateUser,
    setSession,
    // Legacy alias for any component that still reads `token`
    token: accessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth — consume the auth context inside any component.
 *
 * @returns {object} { user, accessToken, refreshToken, loading,
 *                     isAuthenticated, role, login, logout, setSession, token }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within <AuthProvider>.");
  }
  return context;
}
