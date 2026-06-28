/**
 * @fileoverview apiHelpers.js - Axios configuration & response helpers for StudyAI
 *
 * Provides:
 *   - Pre-configured axios instance with interceptors
 *   - `buildRequestConfig` used by useApi
 *   - `handleApiError` normaliser
 *   - Helper wrappers: `get`, `post`, `put`, `patch`, `del`
 *
 * @module utils/apiHelpers
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, STORAGE_KEYS } from './constants';

// ─── Axios Instance ────────────────────────────────────────────────────────────

/**
 * Configured axios instance. Import this for all HTTP calls to ensure
 * auth headers and base URL are applied automatically.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Attempt a single token refresh on 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed – clear auth and let the app redirect to /login
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          window.dispatchEvent(new Event('studyai:session-expired'));
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Config Builder ───────────────────────────────────────────────────────────

/**
 * Builds an axios request config object from discrete parameters.
 * Used internally by `useApi`.
 *
 * @param {string}      url
 * @param {string}      method
 * @param {object|FormData|null} payload
 * @param {import('axios').CancelToken} cancelToken
 * @param {object}      [overrides={}]
 * @returns {import('axios').AxiosRequestConfig}
 */
export const buildRequestConfig = (url, method, payload, cancelToken, overrides = {}) => {
  const isFormData = payload instanceof FormData;
  const isGetLike = ['GET', 'DELETE'].includes(method.toUpperCase());

  const config = {
    url,
    method,
    cancelToken,
    ...overrides,
  };

  if (isFormData) {
    config.data = payload;
    config.headers = { ...config.headers, 'Content-Type': 'multipart/form-data' };
  } else if (payload) {
    if (isGetLike) {
      config.params = payload;
    } else {
      config.data = payload;
    }
  }

  return config;
};

// ─── Error Normaliser ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} NormalisedError
 * @property {string}     message    - User-facing error message.
 * @property {number|null} status    - HTTP status code (null for network errors).
 * @property {string}     code       - Machine-readable code.
 * @property {object|null} data      - Raw response data from the server, if any.
 */

/**
 * Normalises any axios error into a consistent shape.
 *
 * @param {import('axios').AxiosError} error
 * @returns {NormalisedError}
 */
export const handleApiError = (error) => {
  if (axios.isCancel(error)) {
    return { message: 'Request was cancelled.', status: null, code: 'CANCELLED', data: null };
  }

  if (!error.response) {
    // Network error or timeout
    const isTimeout = error.code === 'ECONNABORTED';
    return {
      message: isTimeout
        ? 'The request timed out. Please try again.'
        : 'Network error. Please check your connection.',
      status: null,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      data: null,
    };
  }

  const { status, data } = error.response;

  const serverMessage =
    data?.message ||
    data?.error ||
    data?.detail ||
    (typeof data === 'string' ? data : null);

  const fallbackMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. Please refresh and try again.',
    422: 'Validation failed. Please review your input.',
    429: 'Too many requests. Please slow down and try again.',
    500: 'An internal server error occurred. Please try again later.',
    502: 'Service unavailable. Please try again in a moment.',
    503: 'Service temporarily unavailable.',
  };

  return {
    message: serverMessage ?? fallbackMessages[status] ?? `Unexpected error (${status}).`,
    status,
    code: `HTTP_${status}`,
    data: data ?? null,
  };
};

// ─── Convenience Wrappers ─────────────────────────────────────────────────────

/**
 * GET request. Returns the parsed response data directly.
 * @template T
 * @param {string} url
 * @param {object} [params]
 * @returns {Promise<T>}
 */
export const get = async (url, params) => {
  const { data } = await apiClient.get(url, { params });
  return data;
};

/**
 * POST request.
 * @template T
 * @param {string} url
 * @param {object|FormData} [payload]
 * @returns {Promise<T>}
 */
export const post = async (url, payload) => {
  const { data } = await apiClient.post(url, payload);
  return data;
};

/**
 * PUT request.
 * @template T
 * @param {string} url
 * @param {object} [payload]
 * @returns {Promise<T>}
 */
export const put = async (url, payload) => {
  const { data } = await apiClient.put(url, payload);
  return data;
};

/**
 * PATCH request.
 * @template T
 * @param {string} url
 * @param {object} [payload]
 * @returns {Promise<T>}
 */
export const patch = async (url, payload) => {
  const { data } = await apiClient.patch(url, payload);
  return data;
};

/**
 * DELETE request.
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
export const del = async (url) => {
  const { data } = await apiClient.delete(url);
  return data;
};
