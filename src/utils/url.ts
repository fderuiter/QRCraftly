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
 * Normalizes a URL string to ensure it is valid and properly encoded.
 * Uses native URL API to handle spaces and missing protocols.
 */
export const normalizeUrl = (url: string | undefined): string => {
  if (!url) return '';
  try {
    // 1. Try parsing as is (absolute URL)
    return new URL(url).href;
  } catch (_e) {
    try {
      // 2. Try adding http:// (domain/path only)
      return new URL(`http://${url}`).href;
    } catch (_e2) {
      // 3. Fallback: encodeURI (handles spaces but not protocol)
      try {
        return encodeURI(url);
      } catch (_e3) {
        // 4. Absolute fallback
        return url;
      }
    }
  }
};
