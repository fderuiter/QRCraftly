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

import { SYSTEM_LIMITS } from '../constants';
import { SafeUrlPipeline } from './url';

/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 *
 * @param data The JSON-LD schema object to serialize.
 * @returns A safe, escaped JSON string representation of the data, or '{}' if undefined/invalid.
 */
export const safeJsonLdStringify = (data: any): string => {
  const str = JSON.stringify(data);
  if (!str) return '{}';

  return str.replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
};

/**
 * Checks whether the given URL contains dangerous schemes or matches suspicious patterns.
 * Directly calls the SafeUrlPipeline without any translation wrappers.
 *
 * @param url The input URL to evaluate.
 * @returns True if the URL is dangerous and should be blocked, false otherwise.
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  return SafeUrlPipeline.isDangerous(url);
};

/**
 * Sanitizes a plain input string by stripping control characters and cutting off query parameters.
 * Direct single-function implementation.
 *
 * @param str The raw user input string.
 * @returns The sanitized input string.
 */
export const sanitizeInput = (str: string): string => {
  const noControl = str.replace(/[\x00-\x1F\x7F-\x9F]+/g, '');
  return noControl.split('?')[0];
};

/**
 * Removes all characters that are not digits or valid phone symbols (+, *, #, -, ., (, )).
 * This prevents injection of arbitrary characters into tel: or sms: URIs.
 *
 * @param number The phone number string to clean.
 * @param preserveSemicolonComma Whether to preserve semicolons and commas (for isolated configurations).
 * @returns The cleaned phone number string.
 */
export const cleanPhoneNumber = (number: string, preserveSemicolonComma: boolean = false): string => {
  if (preserveSemicolonComma) {
    return number.replace(/[^0-9+*#\-().;,]/g, '');
  }
  return number.replace(/[^0-9+*#\-().]/g, '');
};

/**
 * Validates an uploaded image file for size and type.
 * Enforces a size limit and allows specific formats based on system limits.
 * @param file The file to validate.
 * @returns A string with an error message if invalid, or null if valid.
 */
export const validateImageUpload = (file: File): string | null => {
  const MAX_SIZE = SYSTEM_LIMITS.MAX_FILE_UPLOAD_MB * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return `File size exceeds the ${SYSTEM_LIMITS.MAX_FILE_UPLOAD_MB}MB limit.`;
  }

  const allowedTypes = SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS;
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.';
  }

  return null;
};
