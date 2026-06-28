/**
 * @fileoverview formatters.js - Display formatting utilities for StudyAI Platform
 *
 * Pure, locale-aware functions to format dates, numbers, durations,
 * file sizes, scores, and text for consistent presentation across the UI.
 *
 * @module utils/formatters
 */

// ─── Date & Time ──────────────────────────────────────────────────────────────

/**
 * Formats a date value into a human-readable string.
 *
 * @param {Date|string|number} date - Anything `new Date()` can consume.
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 *
 * @example
 * formatDate(new Date()); // "Jun 27, 2026"
 */
export const formatDate = (date, opts = {}) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...opts,
    }).format(new Date(date));
  } catch {
    return '—';
  }
};

/**
 * Formats a date with time.
 *
 * @param {Date|string|number} date
 * @returns {string} e.g. "Jun 27, 2026, 09:30 AM"
 */
export const formatDateTime = (date) =>
  formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: true });

/**
 * Returns a relative time string ("2 hours ago", "in 3 days", etc.).
 * Falls back gracefully on browsers without `Intl.RelativeTimeFormat`.
 *
 * @param {Date|string|number} date
 * @returns {string}
 *
 * @example
 * formatRelativeTime(Date.now() - 3600_000); // "1 hour ago"
 */
export const formatRelativeTime = (date) => {
  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffMs = new Date(date).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);
    const diffWk = Math.round(diffDay / 7);
    const diffMo = Math.round(diffDay / 30);

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
    if (Math.abs(diffWk) < 5) return rtf.format(diffWk, 'week');
    return rtf.format(diffMo, 'month');
  } catch {
    return formatDate(date);
  }
};

/**
 * Formats a duration in seconds into MM:SS or HH:MM:SS.
 *
 * @param {number} totalSeconds
 * @returns {string}
 *
 * @example
 * formatDuration(3723); // "1:02:03"
 */
export const formatDuration = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// ─── Numbers & Scores ─────────────────────────────────────────────────────────

/**
 * Formats a percentage value.
 *
 * @param {number} value  - A fraction (0–1) or percent (0–100).
 * @param {boolean} [isFraction=false] - True if `value` is already 0–1.
 * @param {number} [decimals=0]
 * @returns {string} e.g. "87%"
 */
export const formatPercent = (value, isFraction = false, decimals = 0) => {
  const pct = isFraction ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
};

/**
 * Formats a quiz score.
 *
 * @param {number} correct
 * @param {number} total
 * @returns {string} e.g. "8 / 10 (80%)"
 */
export const formatScore = (correct, total) => {
  if (!total) return '— / —';
  const pct = Math.round((correct / total) * 100);
  return `${correct} / ${total} (${pct}%)`;
};

/**
 * Formats a large number with compact notation.
 *
 * @param {number} value
 * @returns {string} e.g. "1.2K", "3.4M"
 */
export const formatCompact = (value) => {
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(value);
  }
};

// ─── File Sizes ───────────────────────────────────────────────────────────────

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string} e.g. "4.2 MB"
 */
export const formatFileSize = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 B';
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1
  );
  return `${(bytes / 1024 ** i).toFixed(decimals)} ${FILE_SIZE_UNITS[i]}`;
};

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * Truncates text to a maximum number of characters with an ellipsis.
 *
 * @param {string} text
 * @param {number} [maxLength=120]
 * @param {string} [ellipsis='…']
 * @returns {string}
 */
export const truncateText = (text, maxLength = 120, ellipsis = '…') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + ellipsis;
};

/**
 * Converts a camelCase or snake_case identifier to Title Case.
 *
 * @param {string} str
 * @returns {string}
 *
 * @example
 * toTitleCase('flashcardStatus') // "Flashcard Status"
 * toTitleCase('in_progress')     // "In Progress"
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Formats a topic/tag string for display.
 * Removes underscores, capitalises first letter.
 *
 * @param {string} topic
 * @returns {string}
 */
export const formatTopic = (topic) => {
  if (!topic) return '';
  return topic.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Pluralises a word based on count.
 *
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string} e.g. "1 card" | "3 cards"
 */
export const pluralise = (count, singular, plural) => {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
};

/**
 * Generates initials from a full name (up to 2 characters).
 *
 * @param {string} name
 * @returns {string} e.g. "JD"
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
};

/**
 * Strips HTML tags from a string (for sanitising AI-generated content).
 *
 * @param {string} html
 * @returns {string}
 */
export const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
};
