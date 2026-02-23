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

import { VCardData } from '../../types';
import { REGEX_PRESERVE_FORMAT_CONTROL_CHARS, isDangerousUrl } from '../security';
import { normalizeUrl } from '../url';

/**
 * Escapes special characters for vCard property values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeVCardString = (str: string | undefined): string => {
  if (!str) return '';
  // 1. Strip non-printable control characters (except newlines and tabs)
  // 2. Escape backslashes first to avoid double escaping
  // 3. Normalize and escape newlines (CRLF, CR, LF) as \n
  // 4. Escape commas and semicolons
  return str
    .replace(REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');
};

/**
 * Constructs the vCard 3.0 string.
 */
export const constructVCardString = (data: VCardData): string => {
  const lastName = escapeVCardString(data.lastName);
  const firstName = escapeVCardString(data.firstName);
  // Normalize URL first to handle spaces/protocols, then check for dangerous protocols on the normalized string
  const normalizedWebsite = normalizeUrl(data.website);
  const website = isDangerousUrl(normalizedWebsite) ? '' : escapeVCardString(normalizedWebsite);

  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`,
    `ORG:${escapeVCardString(data.organization)}`,
    `TITLE:${escapeVCardString(data.title)}`,
    `TEL:${escapeVCardString(data.phone)}`,
    `EMAIL:${escapeVCardString(data.email)}`,
    `URL:${website}`,
    `ADR:;;${escapeVCardString(data.street)};${escapeVCardString(data.city)};;;${escapeVCardString(data.country)}`,
    'END:VCARD',
  ];

  return parts.join('\n');
};
