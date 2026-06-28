/**
 * @fileoverview fileHelpers.js - File upload utilities for StudyAI Platform
 *
 * Helpers for reading, inspecting, and preparing files before they are
 * sent to the Flask back-end. Includes a `buildFormData` helper that
 * automatically pairs a file with its required metadata.
 *
 * @module utils/fileHelpers
 */

import { ALLOWED_EXTENSIONS } from './constants';

// ─── File Info ────────────────────────────────────────────────────────────────

/**
 * Returns the extension of a file (with leading dot, lower-cased).
 *
 * @param {File|string} file - A File object or a filename string.
 * @returns {string} e.g. ".pdf"
 */
export const getFileExtension = (file) => {
  const name = typeof file === 'string' ? file : file?.name ?? '';
  const parts = name.split('.');
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
};

/**
 * Returns a human-friendly file type label.
 *
 * @param {File|string} file
 * @returns {string} e.g. "PDF Document"
 */
export const getFileTypeLabel = (file) => {
  const ext = getFileExtension(file);
  const labels = {
    '.pdf': 'PDF Document',
    '.doc': 'Word Document',
    '.docx': 'Word Document',
    '.txt': 'Plain Text',
    '.md': 'Markdown',
    '.ppt': 'PowerPoint',
    '.pptx': 'PowerPoint',
  };
  return labels[ext] ?? 'Unknown File';
};

/**
 * Returns the appropriate Lucide icon name for a file type.
 * (Consumers import the actual icon from lucide-react.)
 *
 * @param {File|string} file
 * @returns {string} Icon name string
 */
export const getFileIconName = (file) => {
  const ext = getFileExtension(file);
  const icons = {
    '.pdf': 'FileText',
    '.doc': 'FileText',
    '.docx': 'FileText',
    '.txt': 'FileType',
    '.md': 'FileCode',
    '.ppt': 'Presentation',
    '.pptx': 'Presentation',
  };
  return icons[ext] ?? 'File';
};

/**
 * Checks whether a file's extension is among the allowed list.
 *
 * @param {File|string} file
 * @returns {boolean}
 */
export const isAllowedFileType = (file) => {
  return ALLOWED_EXTENSIONS.includes(getFileExtension(file));
};

// ─── File Reading ─────────────────────────────────────────────────────────────

/**
 * Reads a File as a Base64 Data URL string.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });

/**
 * Reads a File as plain text.
 *
 * @param {File} file
 * @param {string} [encoding='UTF-8']
 * @returns {Promise<string>}
 */
export const readFileAsText = (file, encoding = 'UTF-8') =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file, encoding);
  });

/**
 * Reads a File as an ArrayBuffer (useful for binary processing).
 *
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });

// ─── FormData Builder ─────────────────────────────────────────────────────────

/**
 * Builds a `FormData` object with a file and optional metadata fields.
 * Safe to use directly with `axios` (correct Content-Type is inferred).
 *
 * @param {File}   file
 * @param {object} [metadata={}] - Additional fields to append.
 * @param {string} [fileFieldName='file']
 * @returns {FormData}
 *
 * @example
 * const form = buildFormData(selectedFile, { userId: user.id, topic: 'Biology' });
 * await axios.post('/api/materials/upload', form);
 */
export const buildFormData = (file, metadata = {}, fileFieldName = 'file') => {
  const form = new FormData();
  form.append(fileFieldName, file, file.name);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }
  });
  return form;
};

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

/**
 * Extracts File objects from a DragEvent, filtering to allowed types.
 *
 * @param {DragEvent} event
 * @param {boolean} [allowedOnly=true] - Filter to allowed extensions.
 * @returns {File[]}
 */
export const extractFilesFromDrop = (event, allowedOnly = true) => {
  event.preventDefault();
  const items = Array.from(event.dataTransfer?.items ?? []);
  const files = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean);

  return allowedOnly ? files.filter(isAllowedFileType) : files;
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Generates a preview URL for an image file (call URL.revokeObjectURL later).
 *
 * @param {File} file
 * @returns {string|null} Object URL or null if not an image.
 */
export const createImagePreview = (file) => {
  if (!file?.type?.startsWith('image/')) return null;
  return URL.createObjectURL(file);
};

/**
 * Safely revokes an object URL to free memory.
 *
 * @param {string|null} url
 */
export const revokePreviewUrl = (url) => {
  if (url) URL.revokeObjectURL(url);
};
