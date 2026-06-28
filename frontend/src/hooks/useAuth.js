/**
 * @fileoverview useAuth - Authentication hook for StudyAI Platform
 *
 * Thin wrapper around AuthContext that adds derived helpers
 * (hasRole, getDisplayName, getAvatarUrl) so page components never
 * reach into raw context state directly.
 *
 * Consumers should import from this hook, NOT from AuthContext directly:
 *   import { useAuth } from '../../hooks/useAuth';
 *
 * @module hooks/useAuth
 */

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook that exposes the full authentication API.
 *
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   loading: boolean,
 *   isAuthenticated: boolean,
 *   login: (userData: object, idToken: string) => void,
 *   setSession: (session: { user: object, token: string }) => void,
 *   logout: () => void,
 *   hasRole: (role: string) => boolean,
 *   getDisplayName: () => string,
 *   getAvatarUrl: () => string,
 * }}
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 * if (!isAuthenticated) return <Navigate to="/login" />;
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // context is initialised as null, so check for null rather than undefined
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }

  const {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    setSession,
    logout,
  } = context;

  // ── Derived helpers ────────────────────────────────────────────────────────

  /**
   * Checks whether the current user has a specific role.
   * Gracefully handles missing / malformed roles.
   *
   * @param {string} role - e.g. 'admin' | 'student' | 'tutor'
   * @returns {boolean}
   */
  const hasRole = (role) => {
    if (!user?.roles) return false;
    return Array.isArray(user.roles)
      ? user.roles.includes(role)
      : user.roles === role;
  };

  /**
   * Returns a display name with a safe fallback.
   * @returns {string}
   */
  const getDisplayName = () => {
    if (!user) return 'Guest';
    return user.displayName || user.name || user.email?.split('@')[0] || 'Student';
  };

  /**
   * Returns the user's avatar URL, falling back to a deterministic
   * DiceBear avatar derived from their email.
   * @returns {string}
   */
  const getAvatarUrl = () => {
    if (user?.photoURL) return user.photoURL;
    if (user?.avatar) return user.avatar;
    const seed = user?.email || user?.uid || user?.id || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  };

  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    setSession,
    logout,
    hasRole,
    getDisplayName,
    getAvatarUrl,
  };
}
