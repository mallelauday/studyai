/**
 * @fileoverview constants.js - Global constants for StudyAI Platform
 *
 * Centralises all magic strings, numeric limits, and environment-aware
 * values so they never appear scattered across the codebase.
 *
 * @module utils/constants
 */

// ─── Environment ───────────────────────────────────────────────────────────────
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

// ─── API ───────────────────────────────────────────────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_TIMEOUT_MS = 30_000; // 30 seconds

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',
  AUTH_REFRESH: '/auth/refresh',

  // Study materials
  MATERIALS_UPLOAD: '/materials/upload',
  MATERIALS_LIST: '/materials',
  MATERIALS_DELETE: (id) => `/materials/${id}`,

  // AI features
  AI_SUMMARISE: '/ai/summarise',
  AI_FLASHCARDS: '/ai/flashcards',
  AI_QUIZ: '/ai/quiz',
  AI_STUDY_PLAN: '/ai/study-plan',
  AI_EXPLAIN: '/ai/explain',

  // Progress / analytics
  PROGRESS_LIST: '/progress',
  PROGRESS_UPDATE: (id) => `/progress/${id}`,
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_WEEKLY: '/analytics/weekly',

  // Flashcards & Quizzes
  FLASHCARDS_LIST: '/flashcards',
  FLASHCARDS_SAVE: '/flashcards',
  QUIZZES_LIST: '/quizzes',
  QUIZZES_SAVE: '/quizzes',
  QUIZZES_SUBMIT: (id) => `/quizzes/${id}/submit`,

  // Study planner
  PLANNER_LIST: '/planner',
  PLANNER_CREATE: '/planner',
  PLANNER_UPDATE: (id) => `/planner/${id}`,
  PLANNER_DELETE: (id) => `/planner/${id}`,
};

// ─── Local Storage Keys ────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  USER: 'studyai_user',
  TOKEN: 'studyai_token',
  REFRESH_TOKEN: 'studyai_refresh_token',
  THEME: 'studyai_theme',
  SIDEBAR_COLLAPSED: 'studyai_sidebar_collapsed',
  ONBOARDING_COMPLETE: 'studyai_onboarding_done',
  RECENT_TOPICS: 'studyai_recent_topics',
  QUIZ_DRAFT: 'studyai_quiz_draft',
};

// ─── App Meta ─────────────────────────────────────────────────────────────────
export const APP_NAME = 'StudyAI';
export const APP_VERSION = '1.0.0';
export const APP_TAGLINE = 'AI-powered learning, personalised for you.';
export const SUPPORT_EMAIL = 'support@studyai.app';

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 12;
export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

// ─── File Upload ──────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  MD: 'text/markdown',
  PPT: 'application/vnd.ms-powerpoint',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export const ALLOWED_MIME_TYPES = Object.values(ALLOWED_FILE_TYPES);

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.md', '.ppt', '.pptx',
];

// ─── Study Features ───────────────────────────────────────────────────────────
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

export const DIFFICULTY_LABELS = {
  [DIFFICULTY_LEVELS.BEGINNER]: 'Beginner',
  [DIFFICULTY_LEVELS.INTERMEDIATE]: 'Intermediate',
  [DIFFICULTY_LEVELS.ADVANCED]: 'Advanced',
};

export const QUIZ_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
  FILL_IN_BLANK: 'fill_in_blank',
};

export const FLASHCARD_STATUS = {
  NEW: 'new',
  LEARNING: 'learning',
  REVIEW: 'review',
  KNOWN: 'known',
};

export const STUDY_PLANNER_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

// ─── Toasts ───────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 4000;

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// ─── Date / Time ──────────────────────────────────────────────────────────────
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// ─── Analytics ────────────────────────────────────────────────────────────────
export const CHART_COLORS = {
  primary: 'hsl(245, 80%, 65%)',
  secondary: 'hsl(200, 80%, 55%)',
  success: 'hsl(142, 70%, 45%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 72%, 55%)',
  neutral: 'hsl(220, 15%, 55%)',
};

// ─── Routes ───────────────────────────────────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  UPLOAD: '/dashboard/upload',
  SUMMARIES: '/dashboard/summaries',
  FLASHCARDS: '/dashboard/flashcards',
  QUIZZES: '/dashboard/quizzes',
  PLANNER: '/dashboard/planner',
  ANALYTICS: '/dashboard/analytics',
  PROFILE: '/dashboard/profile',
};
