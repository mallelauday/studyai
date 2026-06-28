/**
 * @fileoverview useDebounce - Input debouncing hook for StudyAI Platform
 *
 * Provides two related utilities:
 *   - `useDebounce`        → debounced *value* (reactive)
 *   - `useDebouncedCallback` → debounced *function* (imperative)
 *
 * @module hooks/useDebounce
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of inactivity.
 *
 * @template T
 * @param {T}      value - The value to debounce.
 * @param {number} [delay=400] - Debounce delay in milliseconds.
 * @returns {T} The debounced value.
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 500);
 *
 * useEffect(() => {
 *   if (debouncedQuery) fetchSearchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a debounced version of the provided `callback`.
 * The returned function will only invoke `callback` after `delay` ms
 * have elapsed since its last invocation.
 *
 * The debounced function is stable (referentially equal across renders)
 * and cleans up its timer automatically.
 *
 * @param {Function} callback - The function to debounce.
 * @param {number}   [delay=400] - Debounce delay in milliseconds.
 * @returns {Function} The debounced callback.
 *
 * @example
 * const saveProgress = useDebouncedCallback(
 *   (answers) => api.post('/quiz/save', answers),
 *   800
 * );
 * // Call freely – only fires 800ms after the last invocation
 * saveProgress(currentAnswers);
 */
export function useDebouncedCallback(callback, delay = 400) {
  const timerRef = useRef(null);
  // Keep a stable ref to the latest callback to avoid stale closures
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  // Cancel the pending timer when the component unmounts
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return debouncedFn;
}
