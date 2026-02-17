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

// Includes standard control chars, unicode control chars (0080-009F), whitespace,
// and invisible chars like Zero Width Space (200B), ZWNJ (200C), ZWJ (200D), BOM (FEFF)
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g;

// Matches C0/C1 control chars, unicode format chars (200B-200D, FEFF),
// and line/paragraph separators (2028, 2029).
// Does NOT match standard whitespace (space).
export const REGEX_STRICT_CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u2028\u2029]+/g;

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
  const normalized = url.replace(CONTROL_CHARS_REGEX, '').toLowerCase();

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
  // Remove control characters (00-1F, 7F-9F) and invisible chars to prevent header/parameter injection
  const noControl = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return noControl.split('?')[0];
};
