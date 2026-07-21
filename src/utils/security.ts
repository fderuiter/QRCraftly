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
export const safeJsonLdStringify = (data: any): string => {
  // eslint-disable-next-line no-restricted-syntax
  const str = JSON.stringify(data);
  if (!str) return '{}';

  return str.replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
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
