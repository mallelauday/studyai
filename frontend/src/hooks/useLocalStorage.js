/**
 * @fileoverview useLocalStorage - Persistent state hook for StudyAI Platform
 *
 * Drop-in replacement for `useState` that syncs state to `localStorage`.
 * Handles JSON serialization, SSR safety, cross-tab synchronisation, and
 * graceful error recovery.
 *
 * @module hooks/useLocalStorage
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook that behaves like `useState` but persists the value to
 * `localStorage` under the given `key`.
 *
 * @template T
 * @param {string} key - The localStorage key.
 * @param {T} initialValue - Value used when no persisted data exists.
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 *   A tuple of [storedValue, setValue, removeValue].
 *
 * @example
 * const [flashcardIndex, setFlashcardIndex, resetIndex] =
 *   useLocalStorage('studyai_fc_index', 0);
 */
export function useLocalStorage(key, initialValue) {
  // Lazily read from localStorage once on mount
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Failed to read key "${key}":`, error);
      return initialValue;
    }
  });

  /**
   * Setter that mirrors React's setState API.
   * Accepts a direct value or an updater function.
   *
   * @param {T | ((prev: T) => T)} value
   */
  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore =
          typeof value === 'function' ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Dispatch storage event so other tabs in the same origin sync
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              newValue: JSON.stringify(valueToStore),
            })
          );
        }
      } catch (error) {
        console.warn(`[useLocalStorage] Failed to write key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  /**
   * Removes the key from localStorage and resets state to initialValue.
   */
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Failed to remove key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Stay in sync when another tab writes the same key
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== key) return;
      try {
        setStoredValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue);
      } catch {
        // ignore parse errors from other tabs
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
