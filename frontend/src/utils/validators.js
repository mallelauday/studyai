/**
 * @fileoverview validators.js - Input validation utilities for StudyAI Platform
 *
 * Pure functions that return `{ valid: boolean, message: string }` objects
 * so they integrate cleanly with any form library or custom form state.
 *
 * @module utils/validators
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid   - Whether the value passes validation.
 * @property {string}  message - Human-readable feedback (empty when valid).
 */

/** @returns {ValidationResult} */
const pass = () => ({ valid: true, message: '' });

/** @returns {ValidationResult} */
const fail = (message) => ({ valid: false, message });

// ─── Email ────────────────────────────────────────────────────────────────────

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates an email address.
 *
 * @param {string} email
 * @returns {ValidationResult}
 *
 * @example
 * validateEmail('user@example.com'); // { valid: true, message: '' }
 * validateEmail('bad-email');        // { valid: false, message: '...' }
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return fail('Email is required.');
  if (!EMAIL_RE.test(email.trim())) return fail('Please enter a valid email address.');
  return pass();
};

// ─── Password ─────────────────────────────────────────────────────────────────

/**
 * Validates a password against StudyAI's security requirements.
 *
 * Rules: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 *
 * @param {string} password
 * @returns {ValidationResult}
 */
export const validatePassword = (password) => {
  if (!password) return fail('Password is required.');
  if (password.length < 8)
    return fail('Password must be at least 8 characters long.');
  if (!/[A-Z]/.test(password))
    return fail('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(password))
    return fail('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(password))
    return fail('Password must contain at least one number.');
  return pass();
};

/**
 * Validates that a confirmation password matches the original.
 *
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {ValidationResult}
 */
export const validatePasswordConfirm = (password, confirmPassword) => {
  if (!confirmPassword) return fail('Please confirm your password.');
  if (password !== confirmPassword) return fail('Passwords do not match.');
  return pass();
};

/**
 * Returns a numeric strength score (0-4) for a password.
 * Useful for rendering a strength meter.
 *
 * @param {string} password
 * @returns {{ score: number, label: string, colour: string }}
 */
export const getPasswordStrength = (password = '') => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // special chars bonus

  const levels = [
    { label: 'Very Weak', colour: 'text-red-500' },
    { label: 'Weak',      colour: 'text-orange-500' },
    { label: 'Fair',      colour: 'text-yellow-500' },
    { label: 'Strong',    colour: 'text-blue-500' },
    { label: 'Very Strong', colour: 'text-green-500' },
  ];

  return { score, ...levels[Math.min(score, 4)] };
};

// ─── Name ─────────────────────────────────────────────────────────────────────

/**
 * Validates a display name.
 *
 * @param {string} name
 * @param {{ min?: number, max?: number }} [opts]
 * @returns {ValidationResult}
 */
export const validateName = (name, { min = 2, max = 60 } = {}) => {
  if (!name || !name.trim()) return fail('Name is required.');
  if (name.trim().length < min)
    return fail(`Name must be at least ${min} characters.`);
  if (name.trim().length > max)
    return fail(`Name must be no longer than ${max} characters.`);
  return pass();
};

// ─── URL ──────────────────────────────────────────────────────────────────────

const URL_RE = /^https?:\/\/.+\..+/i;

/**
 * Validates a URL (must start with http/https).
 *
 * @param {string} url
 * @returns {ValidationResult}
 */
export const validateUrl = (url) => {
  if (!url) return fail('URL is required.');
  if (!URL_RE.test(url.trim())) return fail('Please enter a valid URL (https://...).');
  return pass();
};

// ─── File Upload ──────────────────────────────────────────────────────────────

import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from './constants';

/**
 * Validates a File object for the StudyAI upload system.
 *
 * @param {File} file
 * @returns {ValidationResult}
 */
export const validateFile = (file) => {
  if (!file) return fail('No file selected.');

  if (file.size > MAX_FILE_SIZE_BYTES)
    return fail(
      `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`
    );

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeOk && !extOk)
    return fail(
      `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`
    );

  return pass();
};

/**
 * Validates an array of files (batch upload).
 *
 * @param {File[]} files
 * @param {number} [maxFiles=5]
 * @returns {ValidationResult}
 */
export const validateFiles = (files, maxFiles = 5) => {
  if (!files?.length) return fail('Please select at least one file.');
  if (files.length > maxFiles)
    return fail(`You can upload a maximum of ${maxFiles} files at once.`);

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid)
      return fail(`${file.name}: ${result.message}`);
  }

  return pass();
};

// ─── Generic ──────────────────────────────────────────────────────────────────

/**
 * Validates that a required field is not empty.
 *
 * @param {string} value
 * @param {string} [fieldName='This field']
 * @returns {ValidationResult}
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || String(value).trim() === '')
    return fail(`${fieldName} is required.`);
  return pass();
};

/**
 * Validates a text field length.
 *
 * @param {string} value
 * @param {{ min?: number, max?: number, fieldName?: string }} opts
 * @returns {ValidationResult}
 */
export const validateLength = (
  value,
  { min = 0, max = Infinity, fieldName = 'Value' } = {}
) => {
  const len = (value || '').trim().length;
  if (len < min) return fail(`${fieldName} must be at least ${min} characters.`);
  if (len > max) return fail(`${fieldName} must be no more than ${max} characters.`);
  return pass();
};

/**
 * Runs a list of validators and returns the first failure, or `pass()`.
 *
 * @param {Array<() => ValidationResult>} validators
 * @returns {ValidationResult}
 *
 * @example
 * const result = runValidators([
 *   () => validateRequired(email, 'Email'),
 *   () => validateEmail(email),
 * ]);
 */
export const runValidators = (validators) => {
  for (const validator of validators) {
    const result = validator();
    if (!result.valid) return result;
  }
  return pass();
};
