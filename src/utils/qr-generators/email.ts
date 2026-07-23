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

import { EmailData, QRType, QRGeneratorContract } from '../../types';
import { ValidationEngine } from '../../engine/ValidationEngine';
import { parseProtocol } from '../protocol';

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = ValidationEngine.sanitizeInput(data.email);
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

  const parsed = parseProtocol(raw);
  if (!parsed) return result;

  if (parsed.scheme === 'matmsg') {
    result.email = parsed.path;
    result.subject = parsed.params.get('SUB') || '';
    result.body = parsed.params.get('BODY') || '';
    return result;
  }

  if (parsed.scheme === 'mailto') {
    result.email = parsed.path;
    result.subject = parsed.params.get('subject') || '';
    result.body = parsed.params.get('body') || '';
  }

  return result;
};

export const EmailContract: QRGeneratorContract<EmailData> = {
  type: QRType.EMAIL,
  construct: constructEmailString,
  hydrate: hydrateEmailData,
  matches: (raw: string) => ValidationEngine.identifyProtocol(raw) === QRType.EMAIL,
};