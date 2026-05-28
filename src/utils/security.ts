/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 *
 * @param data The JSON-LD schema object to serialize.
 * @returns A safe, escaped JSON string representation of the data, or '{}' if undefined/invalid.
 */
export const safeJsonLdStringify = (data: unknown): string => {
  const str = JSON.stringify(data);
  if (!str) return '{}';

  return str.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
};

// Standard control chars (0x00-0x1F) and DEL (0x7F) + C1 control chars (0x80-0x9F)
// eslint-disable-next-line no-control-regex
export const REGEX_STRICT_CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]+/g;

// Standard control chars except Tab (0x09), Line Feed (0x0A), and Carriage Return (0x0D)
// eslint-disable-next-line no-control-regex
export const REGEX_PRESERVE_FORMAT_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// Includes standard control chars, unicode control chars (0080-009F), whitespace,
// and invisible chars like Zero Width Space (200B), ZWNJ (200C), ZWJ (200D), BOM (FEFF)
// eslint-disable-next-line no-control-regex
export const REGEX_URL_UNSAFE_CHARS = /[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g;

const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'file:',
  'data:',
  'mk:',
  'blob:',
  'filesystem:',
  'jscript:',
  'wscript:',
  'mocha:',
  'about:',
];

/**
 * Checks if a URL string contains a dangerous protocol.
 * Dangerous protocols: javascript:, vbscript:, file:, data:, mk:, blob:, filesystem:, jscript:, wscript:, mocha:, about:
 *
 * @param url The URL string to check.
 * @returns True if the URL contains a dangerous protocol, false otherwise.
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Remove control characters (00-1F, 7F-9F) and whitespace globally
  const normalized = url.replace(REGEX_URL_UNSAFE_CHARS, '').toLowerCase();

  return DANGEROUS_PROTOCOLS.some((p) => normalized.startsWith(p));
};

/**
 * Removes all characters that are not digits or valid phone symbols (+, *, #, -, ., (, )).
 * This prevents injection of arbitrary characters into tel: or sms: URIs.
 *
 * @param number The phone number string to clean.
 * @returns The cleaned phone number string.
 */
export const cleanPhoneNumber = (number: string): string => {
  return number.replace(/[^0-9+*#\-().]/g, '');
};

/**
 * Sanitizes input by stripping query parameters and control characters.
 * Useful for preventing parameter injection in constructed URIs and header injection.
 *
 * @param str The input string to sanitize.
 * @returns The sanitized string without control characters or query parameters.
 */
export const sanitizeInput = (str: string): string => {
  // Remove control characters (00-1F, 7F-9F) to prevent header injection
  const noControl = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return noControl.split('?')[0];
};

/**
 * Validates an uploaded image file for size and type.
 * Enforces a 2MB size limit and allows jpeg, png, webp, and svg formats.
 * @param file The file to validate.
 * @returns A string with an error message if invalid, or null if valid.
 */
export const validateImageUpload = (file: File): string | null => {
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE) {
    return 'File size exceeds the 2MB limit.';
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.';
  }

  return null;
};
