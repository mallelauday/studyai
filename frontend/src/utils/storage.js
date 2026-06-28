/**
 * @fileoverview storage.js - Local & session storage helpers for StudyAI Platform
 *
 * Safe wrappers around `localStorage` and `sessionStorage` that handle
 * JSON serialisation / deserialisation and never throw in private-browsing
 * or storage-quota scenarios.
 *
 * @module utils/storage
 */

// ─── Local Storage ────────────────────────────────────────────────────────────

/**
 * Reads an item from `localStorage` and parses it as JSON.
 * Returns `defaultValue` if the key is missing or the parse fails.
 *
 * @template T
 * @param {string} key
 * @param {T} [defaultValue=null]
 * @returns {T}
 */
export const lsGet = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Serialises `value` to JSON and stores it in `localStorage`.
 * Returns `true` on success, `false` if storage is unavailable / full.
 *
 * @param {string} key
 * @param {*}      value
 * @returns {boolean}
 */
export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes a key from `localStorage`.
 *
 * @param {string} key
 */
export const lsRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently swallow quota/privacy errors
  }
};

/**
 * Removes all keys from `localStorage` that start with `prefix`.
 *
 * @param {string} prefix
 */
export const lsClearByPrefix = (prefix) => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently swallow
  }
};

/**
 * Clears all StudyAI-specific keys (prefix `studyai_`).
 */
export const lsClearStudyAI = () => lsClearByPrefix('studyai_');

// ─── Session Storage ──────────────────────────────────────────────────────────

/**
 * Reads an item from `sessionStorage` and parses it as JSON.
 *
 * @template T
 * @param {string} key
 * @param {T} [defaultValue=null]
 * @returns {T}
 */
export const ssGet = (key, defaultValue = null) => {
  try {
    const item = sessionStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Stores a value in `sessionStorage` as JSON.
 *
 * @param {string} key
 * @param {*}      value
 * @returns {boolean}
 */
export const ssSet = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes a key from `sessionStorage`.
 *
 * @param {string} key
 */
export const ssRemove = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Silently swallow
  }
};

// ─── Composite: Draft Management ──────────────────────────────────────────────

/**
 * Saves a form draft to `localStorage`.
 * Key pattern: `studyai_draft_{formId}`.
 *
 * @param {string} formId   - Unique identifier for the form.
 * @param {object} draftData
 */
export const saveDraft = (formId, draftData) => {
  lsSet(`studyai_draft_${formId}`, {
    data: draftData,
    savedAt: new Date().toISOString(),
  });
};

/**
 * Retrieves a saved form draft from `localStorage`.
 *
 * @param {string} formId
 * @returns {{ data: object, savedAt: string } | null}
 */
export const getDraft = (formId) => lsGet(`studyai_draft_${formId}`, null);

/**
 * Deletes a saved form draft.
 *
 * @param {string} formId
 */
export const clearDraft = (formId) => lsRemove(`studyai_draft_${formId}`);

// ─── Composite: Recent Items ───────────────────────────────────────────────────

/**
 * Pushes an item to a "recently viewed" list stored in `localStorage`.
 * Keeps the list bounded to `maxItems` (FIFO, deduplicates by `id`).
 *
 * @template T
 * @param {string} listKey  - The storage key for this list.
 * @param {T}      item     - Item must have an `id` field.
 * @param {number} [maxItems=10]
 */
export const pushRecentItem = (listKey, item, maxItems = 10) => {
  const current = lsGet(listKey, []);
  const filtered = current.filter((i) => i.id !== item.id);
  const updated = [item, ...filtered].slice(0, maxItems);
  lsSet(listKey, updated);
};

/**
 * Retrieves a "recently viewed" list.
 *
 * @template T
 * @param {string} listKey
 * @returns {T[]}
 */
export const getRecentItems = (listKey) => lsGet(listKey, []);

/**
 * Clears a "recently viewed" list.
 *
 * @param {string} listKey
 */
export const clearRecentItems = (listKey) => lsRemove(listKey);
