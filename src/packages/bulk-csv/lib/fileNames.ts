/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

const MAX_STEM_LENGTH = 100;

/**
 * Turns a CSV cell into a file name stem that is safe on Windows, macOS and Linux:
 * path separators, reserved characters and control characters become `_`, leading
 * dots are dropped (no hidden files or `..`), and the result is capped at 100
 * characters. Falls back to `fallback` when nothing usable is left.
 */
export function sanitizeFileStem(raw: string, fallback = 'qr_code'): string {
  const cleaned = Array.from(raw, (ch) => (ch.charCodeAt(0) < 0x20 || '\\/?:*"<>|'.includes(ch) ? '_' : ch))
    .join('')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, MAX_STEM_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Returns `stem.ext`, or `stem_2.ext`, `stem_3.ext`, ... when that name is already in
 * `used` (compared case-insensitively, as on Windows and macOS). Records the name it returns.
 */
export function allocateFileName(stem: string, ext: string, used: Set<string>): string {
  let name = `${stem}.${ext}`;
  let suffix = 2;
  while (used.has(name.toLowerCase())) {
    name = `${stem}_${suffix}.${ext}`;
    suffix += 1;
  }
  used.add(name.toLowerCase());
  return name;
}
