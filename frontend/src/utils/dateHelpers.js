/**
 * @fileoverview dateHelpers.js - Date utilities for StudyAI Platform
 *
 * Lightweight, dependency-free date helpers (no date-fns / moment required).
 * All functions accept `Date | string | number` for maximum flexibility.
 *
 * @module utils/dateHelpers
 */

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Coerces any date-like value to a `Date` object.
 * Returns `null` on invalid input.
 *
 * @param {Date|string|number|null} value
 * @returns {Date|null}
 */
export const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// ─── Comparisons ──────────────────────────────────────────────────────────────

/**
 * Returns true if `date` falls on today.
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export const isToday = (date) => {
  const d = toDate(date);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/**
 * Returns true if `date` is in the past.
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export const isPast = (date) => {
  const d = toDate(date);
  return d ? d.getTime() < Date.now() : false;
};

/**
 * Returns true if `date` is in the future.
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export const isFuture = (date) => {
  const d = toDate(date);
  return d ? d.getTime() > Date.now() : false;
};

/**
 * Returns true if `date` is overdue (past and not today).
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export const isOverdue = (date) => isPast(date) && !isToday(date);

/**
 * Returns the difference in whole days between two dates.
 * Positive = `b` is later; negative = `b` is earlier.
 *
 * @param {Date|string|number} a
 * @param {Date|string|number} [b=new Date()]
 * @returns {number}
 */
export const diffDays = (a, b = new Date()) => {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return 0;
  const MS_PER_DAY = 86_400_000;
  return Math.round((db.getTime() - da.getTime()) / MS_PER_DAY);
};

// ─── Manipulation ─────────────────────────────────────────────────────────────

/**
 * Adds `n` days to a date (non-mutating).
 *
 * @param {Date|string|number} date
 * @param {number} n - Negative to subtract.
 * @returns {Date}
 */
export const addDays = (date, n) => {
  const d = new Date(toDate(date) ?? Date.now());
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Adds `n` weeks to a date (non-mutating).
 *
 * @param {Date|string|number} date
 * @param {number} n
 * @returns {Date}
 */
export const addWeeks = (date, n) => addDays(date, n * 7);

/**
 * Adds `n` months to a date (non-mutating).
 *
 * @param {Date|string|number} date
 * @param {number} n
 * @returns {Date}
 */
export const addMonths = (date, n) => {
  const d = new Date(toDate(date) ?? Date.now());
  d.setMonth(d.getMonth() + n);
  return d;
};

/**
 * Returns the start of the day (midnight) for a given date.
 *
 * @param {Date|string|number} date
 * @returns {Date}
 */
export const startOfDay = (date) => {
  const d = new Date(toDate(date) ?? Date.now());
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Returns the end of the day (23:59:59.999) for a given date.
 *
 * @param {Date|string|number} date
 * @returns {Date}
 */
export const endOfDay = (date) => {
  const d = new Date(toDate(date) ?? Date.now());
  d.setHours(23, 59, 59, 999);
  return d;
};

// ─── Week / Study Plan Helpers ────────────────────────────────────────────────

/**
 * Returns an array of 7 `Date` objects representing the current ISO week
 * (Monday → Sunday).
 *
 * @param {Date|string|number} [anchor=new Date()]
 * @returns {Date[]}
 */
export const getCurrentWeekDays = (anchor = new Date()) => {
  const d = toDate(anchor) ?? new Date();
  const day = d.getDay(); // 0 = Sun
  const monday = addDays(d, -(day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

/**
 * Returns a `YYYY-MM-DD` ISO date string for the given date.
 * Useful as keys in study planner maps.
 *
 * @param {Date|string|number} date
 * @returns {string}
 */
export const toISODateString = (date) => {
  const d = toDate(date);
  if (!d) return '';
  return d.toISOString().slice(0, 10);
};

/**
 * Groups an array of items by their ISO date string, using a `date` accessor.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Date|string|number} getDate
 * @returns {Record<string, T[]>}
 *
 * @example
 * const grouped = groupByDate(sessions, (s) => s.scheduledAt);
 * // { '2026-06-27': [...], '2026-06-28': [...] }
 */
export const groupByDate = (items, getDate) => {
  return items.reduce((acc, item) => {
    const key = toISODateString(getDate(item));
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

// ─── Streaks ──────────────────────────────────────────────────────────────────

/**
 * Calculates the current study streak in consecutive days from a sorted
 * array of ISO date strings (ascending order).
 *
 * @param {string[]} dateStrings - Sorted ISO date strings (e.g. ['2026-06-25', ...]).
 * @returns {number} Number of consecutive days up to today.
 */
export const calculateStreak = (dateStrings) => {
  if (!dateStrings?.length) return 0;

  const today = toISODateString(new Date());
  const unique = [...new Set(dateStrings)].sort().reverse();

  let streak = 0;
  let expected = today;

  for (const ds of unique) {
    if (ds === expected) {
      streak++;
      expected = toISODateString(addDays(ds, -1));
    } else {
      break;
    }
  }

  return streak;
};
