/**
 * @fileoverview useApi - Declarative API request hook for StudyAI Platform
 *
 * Wraps `axios` with React state management to provide a consistent
 * data / loading / error pattern. Supports:
 *   - Manual triggers (lazy mode, default)
 *   - Automatic fetch on mount (eager mode)
 *   - Request cancellation on unmount
 *   - Retry logic with exponential back-off
 *
 * @module hooks/useApi
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { buildRequestConfig, handleApiError } from '../utils/apiHelpers';

/**
 * @typedef {Object} UseApiOptions
 * @property {boolean}  [immediate=false]  - Auto-fire on mount.
 * @property {number}   [retries=0]        - Number of retry attempts.
 * @property {number}   [retryDelay=1000]  - Base delay in ms (doubles each retry).
 * @property {Function} [onSuccess]        - Called with data on success.
 * @property {Function} [onError]          - Called with error on failure.
 */

/**
 * @typedef {Object} UseApiReturn
 * @property {any}      data      - Parsed response data.
 * @property {boolean}  loading   - True while a request is in flight.
 * @property {object|null} error  - Normalised error object or null.
 * @property {Function} execute   - Trigger the request manually.
 * @property {Function} reset     - Clear data / error state.
 */

/**
 * A sleep helper that respects AbortSignal.
 * @param {number} ms
 * @param {AbortSignal} signal
 */
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/**
 * Custom hook for declarative API calls.
 *
 * @param {string} url - Endpoint URL (relative or absolute).
 * @param {string} [method='GET'] - HTTP method.
 * @param {UseApiOptions} [options={}]
 * @returns {UseApiReturn}
 *
 * @example
 * // Lazy – called manually
 * const { data, loading, error, execute } = useApi('/api/quiz/generate', 'POST');
 * const handleGenerate = () => execute({ topic: 'photosynthesis', count: 5 });
 *
 * @example
 * // Eager – fires immediately on mount
 * const { data: summaries, loading } = useApi('/api/summaries', 'GET', { immediate: true });
 */
export function useApi(url, method = 'GET', options = {}) {
  const {
    immediate = false,
    retries = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // CancelToken source, recreated on each call
  const cancelSourceRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelSourceRef.current?.cancel('Component unmounted');
    };
  }, []);

  /**
   * Executes the API request.
   *
   * @param {object|FormData|null} [payload=null] - Request body / params.
   * @param {object} [overrides={}] - Per-call axios config overrides.
   * @returns {Promise<any>} Resolved with parsed data or rejected with error.
   */
  const execute = useCallback(
    async (payload = null, overrides = {}) => {
      // Cancel any in-flight request before starting a new one
      cancelSourceRef.current?.cancel('New request initiated');
      const source = axios.CancelToken.source();
      cancelSourceRef.current = source;

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      let attempt = 0;

      while (attempt <= retries) {
        try {
          const config = buildRequestConfig(
            url,
            method,
            payload,
            source.token,
            overrides
          );

          const response = await axios(config);
          const result = response.data;

          if (isMountedRef.current) {
            setData(result);
            setLoading(false);
            onSuccess?.(result);
          }

          return result;
        } catch (err) {
          if (axios.isCancel(err)) {
            // Silently abort – component unmounted or request superseded
            return;
          }

          attempt += 1;

          if (attempt <= retries) {
            // Exponential back-off
            await sleep(retryDelay * 2 ** (attempt - 1), source.token);
            continue;
          }

          const normalised = handleApiError(err);

          if (isMountedRef.current) {
            setError(normalised);
            setLoading(false);
            onError?.(normalised);
          }

          throw normalised;
        }
      }
    },
    [url, method, retries, retryDelay, onSuccess, onError]
  );

  /**
   * Resets the hook to its initial state.
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Auto-fire on mount when `immediate` is true
  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { data, loading, error, execute, reset };
}
