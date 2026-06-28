/**
 * ============================================================
 * StudyAI Frontend — Centralized Axios API Client
 * ============================================================
 *
 * Architecture
 * ------------
 *   apiClient          – the configured Axios instance
 *   Request interceptor  – attaches Authorization: Bearer <access_token>
 *   Response interceptor – on 401, attempts silent token refresh;
 *                          on refresh failure, calls logout + redirects
 *
 * Token storage keys (must match AuthContext)
 * -------------------------------------------
 *   studyai_access_token   – short-lived Flask JWT (15 min)
 *   studyai_refresh_token  – long-lived Flask JWT (7 days)
 *   studyai_user           – JSON-serialised user object
 *
 * Usage
 * -----
 *   import api from "@/services/api";
 *   const { data } = await api.post("/auth/login", { email, password });
 *   // data === { success, data: { user, access_token, ... } }
 */

import axios from "axios";

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_URL        = "http://127.0.0.1:5000/api";
const ACCESS_KEY      = "studyai_access_token";
const REFRESH_KEY     = "studyai_refresh_token";
const USER_KEY        = "studyai_user";

// ── Token helpers ────────────────────────────────────────────────────────────

export const tokenStore = {
  getAccess:       () => localStorage.getItem(ACCESS_KEY)  || null,
  getRefresh:      () => localStorage.getItem(REFRESH_KEY) || null,
  setAccess:  (t)  => localStorage.setItem(ACCESS_KEY,  t),
  setRefresh: (t)  => localStorage.setItem(REFRESH_KEY, t),
  setUser:    (u)  => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clearAll:   ()   => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    // Legacy key cleanup
    localStorage.removeItem("studyai_token");
  },
};

// ── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — attach Bearer token ────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccess();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh-token state ───────────────────────────────────────────────────────
// Prevents a race condition where multiple concurrent 401 responses each try
// to refresh the token simultaneously.

let isRefreshing   = false;
let refreshQueue   = [];   // pending requests waiting for the new access token

function processQueue(error, newToken = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken);
  });
  refreshQueue = [];
}

/**
 * Attempt a silent token refresh.
 * Returns the new access_token string, or throws on failure.
 */
async function silentRefresh() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error("No refresh token available.");

  // Use plain axios (not apiClient) to avoid interceptor loops
  const response = await axios.post(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.error || "Refresh failed.");
  }

  const { access_token } = response.data.data;
  tokenStore.setAccess(access_token);
  return access_token;
}

/**
 * Clear all tokens and redirect to /login.
 * Called when the refresh token itself is expired / revoked.
 */
function forceLogout() {
  tokenStore.clearAll();
  // Use window.location so we break out of any router context
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ── Response interceptor — handle 401 with auto-refresh ─────────────────────

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 responses, and only once per request (_retry guard)
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh on auth endpoints themselves
    const isAuthEndpoint = originalRequest.url?.includes("/auth/");
    if (isAuthEndpoint) {
      forceLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
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

// ── Custom Domain Helpers attached to apiClient ──────────────────────────────

apiClient.generateStudyPlan = (payload) => apiClient.post("/study-plan/generate", payload);
apiClient.getStudyPlan = () => apiClient.get("/study-plan");
apiClient.updateStudyPlan = (days) => apiClient.put("/study-plan", { days });

apiClient.exportPDF = async (type = "study-plan", id = "") => {
  const response = await apiClient.get("/export/pdf", {
    params: { type, id },
    responseType: "arraybuffer"
  });
  // Expose both res.data and a res.blob() helper for robust compatibility
  response.blob = async () => response.data;
  return response;
};

// ── Default export ───────────────────────────────────────────────────────────

export default apiClient;

// ── Named domain helpers (optional convenience) ──────────────────────────────

export const authApi = {
  login:    (credentials)  => apiClient.post("/auth/login",    credentials),
  register: (payload)      => apiClient.post("/auth/register", payload),
  refresh:  (refreshToken) => apiClient.post("/auth/refresh",  { refresh_token: refreshToken }),
  logout:   ()             => apiClient.post("/auth/logout"),
  me:       ()             => apiClient.get("/auth/me"),
};

