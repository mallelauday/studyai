/**
 * @fileoverview useTheme - Theme management hook for StudyAI Platform
 *
 * Provides ergonomic access to the ThemeContext. Exposes `isDark`,
 * `isLight`, and a `setTheme` escape-hatch in addition to `toggleTheme`.
 *
 * @module hooks/useTheme
 */

import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Custom hook that exposes theme state and helpers.
 *
 * @returns {{
 *   theme: 'light' | 'dark',
 *   toggleTheme: () => void,
 *   setTheme: (theme: 'light' | 'dark') => void,
 *   isDark: boolean,
 *   isLight: boolean,
 * }}
 *
 * @example
 * const { isDark, toggleTheme } = useTheme();
 * return <button onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>;
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }

  const { theme, toggleTheme, setTheme } = context;

  return {
    theme,
    toggleTheme,
    /** Explicit setter – useful when you want to force a specific theme */
    setTheme: setTheme ?? ((t) => {
      // Fallback if the context hasn't been upgraded yet
      if (t !== theme) toggleTheme();
    }),
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
