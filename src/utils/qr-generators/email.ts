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

import { EmailData } from '../../types';
import { sanitizeInput } from '../security';

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = sanitizeInput(data.email);
  return `mailto:${safeEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
};

/**
 * Hydrates EmailData from a raw string.
 */
export const hydrateEmailData = (raw: string): EmailData => {
  const result: EmailData = {
    email: '',
    subject: '',
    body: '',
  };

  if (raw.startsWith('MATMSG:')) {
    const content = raw.substring(7).replace(/;+$/, '');
    const parts = content.split(';');
    parts.forEach(part => {
      const splitIndex = part.indexOf(':');
      if (splitIndex <= 0) return;
      const key = part.substring(0, splitIndex);
      const value = part.substring(splitIndex + 1);
      if (key === 'TO') result.email = value;
      if (key === 'SUB') result.subject = value;
      if (key === 'BODY') result.body = value;
    });
    return result;
  }

  if (raw.toLowerCase().startsWith('mailto:')) {
    const urlStr = raw.replace(/^mailto:/i, 'http://localhost/');
    const url = new URL(urlStr);
    result.email = url.pathname.replace(/^\//, '');
    result.subject = url.searchParams.get('subject') || '';
    result.body = url.searchParams.get('body') || '';
  }

  return result;
};
