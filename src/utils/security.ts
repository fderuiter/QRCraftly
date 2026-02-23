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
 */
export const safeJsonLdStringify = (data: any): string => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
                             .replace(/>/g, '\\u003e')
                             .replace(/&/g, '\\u0026');
};

// Standard control chars (0x00-0x1F) and DEL (0x7F) + C1 control chars (0x80-0x9F)
export const REGEX_STRICT_CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]+/g;

// Standard control chars except Tab (0x09), Line Feed (0x0A), and Carriage Return (0x0D)
export const REGEX_PRESERVE_FORMAT_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// Includes standard control chars, unicode control chars (0080-009F), whitespace,
// and invisible chars like Zero Width Space (200B), ZWNJ (200C), ZWJ (200D), BOM (FEFF)
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
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Remove control characters (00-1F, 7F-9F) and whitespace globally
  const normalized = url.replace(REGEX_URL_UNSAFE_CHARS, '').toLowerCase();

  return DANGEROUS_PROTOCOLS.some(p => normalized.startsWith(p));
};

/**
 * Removes all characters that are not digits or valid phone symbols (+, *, #, -, ., (, )).
 * This prevents injection of arbitrary characters into tel: or sms: URIs.
 */
export const cleanPhoneNumber = (number: string): string => {
  return number.replace(/[^0-9+*#\-().]/g, '');
};

/**
 * Sanitizes input by stripping query parameters and control characters.
 * Useful for preventing parameter injection in constructed URIs and header injection.
 */
export const sanitizeInput = (str: string): string => {
  // Remove control characters (00-1F, 7F-9F) to prevent header injection
  const noControl = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return noControl.split('?')[0];
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validates an uploaded image file for size and type.
 * @param file - The file to validate.
 * @returns Object indicating validity and optional error message.
 */
export const validateImageUpload = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload a PNG, JPEG, or WebP image.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size too large. Maximum size is 2MB.' };
  }
  return { valid: true };
};
