/**
 * ============================================================
 * StudyAI Frontend — Centralized Axios API Client
 * ============================================================
 */

import axios from "axios";

// Dynamic API URL resolution with fallback and normalization
let envApiUrl = import.meta.env.VITE_API_URL || "https://studyai-iz8i.onrender.com";
if (envApiUrl && !envApiUrl.endsWith("/api") && !envApiUrl.endsWith("/api/")) {
    envApiUrl = envApiUrl.endsWith("/") ? `${envApiUrl}api` : `${envApiUrl}/api`;
}
const API_BASE_URL = envApiUrl;

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 30000,
});

export const apiClient = api;

const ACCESS_KEY = "studyai_access_token";
const REFRESH_KEY = "studyai_refresh_token";
const USER_KEY = "studyai_user";

export const tokenStore = {
  getAccess:  () => localStorage.getItem(ACCESS_KEY)  || null,
  getRefresh: () => localStorage.getItem(REFRESH_KEY) || null,
  setAccess:  (t) => localStorage.setItem(ACCESS_KEY,  t),
  setRefresh: (t) => localStorage.setItem(REFRESH_KEY, t),
  setUser:    (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clearAll:   () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("studyai_token");
  },
};

// Request interceptor — attach Bearer token and debug logging
api.interceptors.request.use(
  (config) => {
    console.log("API URL:", import.meta.env.VITE_API_URL);
    console.log("Request:", config.url, config.data || config.params || null);
    const token = tokenStore.getAccess();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with refresh logic and debug logging
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, newToken = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken);
  });
  refreshQueue = [];
}

async function silentRefresh() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error("No refresh token available.");

  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.error || "Refresh failed.");
  }

  const { access_token } = response.data.data;
  tokenStore.setAccess(access_token);
  return access_token;
}

function forceLogout() {
  tokenStore.clearAll();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    console.error("API Error:", error);
    console.error("API ERROR URL:", error?.config?.url || "unknown URL");
    console.error("API ERROR MSG:", error?.message || error);

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = originalRequest.url?.includes("/auth/");
    if (isAuthEndpoint) {
      forceLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const newToken = await silentRefresh();
      processQueue(null, newToken);
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Helpers (moved from apiHelpers.js)
export const handleApiError = (error) => {
  if (axios.isCancel(error)) {
    return { message: "Request was cancelled.", status: null, code: "CANCELLED", data: null };
  }

  if (!error.response) {
    const isTimeout = error.code === "ECONNABORTED";
    return {
      message: isTimeout
        ? "The request timed out. Please try again."
        : "Network error. Please check your connection.",
      status: null,
      code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      data: null,
    };
  }

  const { status, data } = error.response;
  const serverMessage =
    data?.message ||
    data?.error ||
    data?.detail ||
    (typeof data === "string" ? data : null);

  const fallbackMessages = {
    400: "Invalid request. Please check your input.",
    401: "Your session has expired. Please log in again.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "A conflict occurred. Please refresh and try again.",
    422: "Validation failed. Please review your input.",
    429: "Too many requests. Please slow down and try again.",
    500: "An internal server error occurred. Please try again later.",
    502: "Service unavailable. Please try again in a moment.",
    503: "Service temporarily unavailable.",
  };

  return {
    message: serverMessage ?? fallbackMessages[status] ?? `Unexpected error (${status}).`,
    status,
    code: `HTTP_${status}`,
    data: data ?? null,
  };
};

export const buildRequestConfig = (url, method, payload, cancelToken, overrides = {}) => {
  const isFormData = payload instanceof FormData;
  const isGetLike = ["GET", "DELETE"].includes(method.toUpperCase());

  const config = {
    url,
    method,
    cancelToken,
    ...overrides,
  };

  if (isFormData) {
    config.data = payload;
    config.headers = { ...config.headers, "Content-Type": "multipart/form-data" };
  } else if (payload) {
    if (isGetLike) {
      config.params = payload;
    } else {
      config.data = payload;
    }
  }

  return config;
};

// Custom Domain Helpers attached to apiClient
apiClient.generateStudyPlan = (payload) => apiClient.post("/study-plan/generate", payload);
apiClient.getStudyPlan = () => apiClient.get("/study-plan");
apiClient.updateStudyPlan = (days) => apiClient.put("/study-plan", { days });

apiClient.exportPDF = async (type = "study-plan", id = "") => {
  const response = await apiClient.get("/export/pdf", {
    params: { type, id },
    responseType: "blob"
  });
  return response;
};

// Named auth convenience wrapper
export const authApi = {
  login:    (credentials)  => apiClient.post("/auth/login",    credentials),
  register: (payload)      => apiClient.post("/auth/register", payload),
  refresh:  (refreshToken) => apiClient.post("/auth/refresh",  { refresh_token: refreshToken }),
  logout:   ()             => apiClient.post("/auth/logout"),
  me:       ()             => apiClient.get("/auth/me"),
};

// Default export apiClient as the single default export
export default apiClient;
