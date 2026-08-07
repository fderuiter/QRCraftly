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
  return `mailto:${data.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
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
  validate: (raw: string) => {
    const violations: string[] = [];
    const trimmed = raw.trim();
    if (!trimmed) {
      violations.push('EMAIL_STRUCTURE_VIOLATION');
      return violations;
    }

    const parsed = parseProtocol(trimmed);
    if (!parsed) {
      // Fallback for raw email addresses
      if (!ValidationEngine.CONTAINMENT_PROFILES.EMAIL.test(trimmed)) {
        violations.push('EMAIL_STRUCTURE_VIOLATION');
      }
      return violations;
    }

    // Check scheme validity
    if (parsed.scheme !== 'mailto' && parsed.scheme !== 'matmsg') {
      violations.push('EMAIL_STRUCTURE_VIOLATION');
      return violations;
    }

    // Validate email address
    if (!parsed.path || !ValidationEngine.CONTAINMENT_PROFILES.EMAIL.test(parsed.path)) {
      violations.push('EMAIL_STRUCTURE_VIOLATION');
    }

    // Deep metadata delimiter validation
    if (parsed.scheme === 'matmsg') {
      const content = trimmed.substring(7);

      // Helper to split by unescaped semicolons
      const splitByUnescapedSemicolons = (str: string): string[] => {
        const result: string[] = [];
        let current = '';
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === ';') {
            let backslashCount = 0;
            let j = i - 1;
            while (j >= 0 && str[j] === '\\') {
              backslashCount++;
              j--;
            }
            if (backslashCount % 2 === 0) {
              result.push(current);
              current = '';
            } else {
              current += ';';
            }
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const segments = splitByUnescapedSemicolons(content);
      while (segments.length > 0 && segments[segments.length - 1].trim() === '') {
        segments.pop();
      }

      const KNOWN_KEYS = new Set(['TO', 'SUB', 'BODY']);
      for (const segment of segments) {
        const colonIndex = segment.indexOf(':');
        if (colonIndex <= 0) {
          violations.push('DELIMITER_VIOLATION');
          break;
        }
        const key = segment.substring(0, colonIndex).toUpperCase();
        if (!KNOWN_KEYS.has(key)) {
          violations.push('DELIMITER_VIOLATION');
          break;
        }
      }
    } else if (parsed.scheme === 'mailto') {
      const queryIdx = trimmed.indexOf('?');
      if (queryIdx !== -1) {
        const query = trimmed.substring(queryIdx + 1);
        // Second '?' in query indicates unescaped delimiter
        if (query.includes('?')) {
          violations.push('DELIMITER_VIOLATION');
        } else {
          // If query parameters have keys other than subject or body, or empty keys, it indicates unescaped '&' or malformed parameters
          try {
            const urlParams = new URLSearchParams(query);
            urlParams.forEach((_, key) => {
              const lowerKey = key.toLowerCase();
              if (lowerKey !== 'subject' && lowerKey !== 'body') {
                violations.push('DELIMITER_VIOLATION');
              }
            });
            if (query.startsWith('&') || query.endsWith('&') || query.includes('&&')) {
              violations.push('DELIMITER_VIOLATION');
            }
          } catch (_e) {
            violations.push('DELIMITER_VIOLATION');
          }
        }
      }
    }

    // Deduplicate violations
    return Array.from(new Set(violations));
  },
};