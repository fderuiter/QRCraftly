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

// Strict control characters including ASCII/Latin-1 control characters, zero-width spaces, and BOM
// Set: \x00-\x1F, \x7F-\x9F, \u200B-\u200D, \uFEFF
export const REGEX_STRICT_NO_CONTROL_TEST = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;
export const REGEX_STRICT_CONTROL_CHARS_STRIP = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g;

// Format-preserving control characters, which exclude \t (\x09), \n (\x0A), and \r (\x0D)
// Set: \x00-\x08, \x0B\x0C, \x0E-\x1F, \x7F-\x9F, \u200B-\u200D, \uFEFF
export const REGEX_PRESERVE_FORMAT_NO_CONTROL_TEST = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;
export const REGEX_PRESERVE_FORMAT_CONTROL_CHARS_STRIP = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g;
