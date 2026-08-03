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

import { EventData, QRType, QRGeneratorContract } from '../../types';
import { ValidationEngine } from '../../engine/ValidationEngine';
import { SafeUrlPipeline } from '../url';
import {
  escapeVCardEvent,
  unescapeVCardEvent,
  foldString,
  unfoldString,
  formatEventDateTime,
  parseEventDateTime,
} from './rfcHelper';

/**
 * Hydrates EventData from a raw string.
 */
export const hydrateEventData = (raw: string): EventData => {
  const result: EventData = {
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
  };

  if (!raw.includes('BEGIN:VEVENT')) return result;

  const unfolded = unfoldString(raw);
  const lines = unfolded.split(/\r\n|\r|\n/);
  lines.forEach(line => {
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) return;
    
    const fullKey = line.substring(0, splitIndex);
    const key = fullKey.split(';')[0].toUpperCase();
    const value = line.substring(splitIndex + 1);
    const keyParams = fullKey.substring(key.length);

    switch(key) {
      case 'SUMMARY': result.title = unescapeVCardEvent(value); break;
      case 'DTSTART': result.startDate = parseEventDateTime(value, keyParams); break;
      case 'DTEND': result.endDate = parseEventDateTime(value, keyParams); break;
      case 'LOCATION': result.location = unescapeVCardEvent(value); break;
      case 'DESCRIPTION': result.description = unescapeVCardEvent(value); break;
    }
  });

  return result;
};

/**
 * Constructs an iCalendar VEVENT payload.
 */
export const constructEventString = (data: EventData): string => {
  const startFormatted = formatEventDateTime(data.startDate);
  const endFormatted = formatEventDateTime(data.endDate);

  const dtstartKey = startFormatted.tzid ? `DTSTART;TZID=${startFormatted.tzid}` : 'DTSTART';
  const dtendKey = endFormatted.tzid ? `DTEND;TZID=${endFormatted.tzid}` : 'DTEND';

  const parts = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QRCraftly//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeVCardEvent(data.title)}`,
    `${dtstartKey}:${startFormatted.value}`,
    `${dtendKey}:${endFormatted.value}`,
    `LOCATION:${escapeVCardEvent(data.location)}`,
    `DESCRIPTION:${escapeVCardEvent(data.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return foldString(parts.join('\n'));
};

export const EventContract: QRGeneratorContract<EventData> = {
  type: QRType.EVENT,
  construct: constructEventString,
  hydrate: hydrateEventData,
  matches: (raw: string) => raw.includes('BEGIN:VEVENT') || raw.includes('BEGIN:VCALENDAR'),
  validate: (raw: string) => {
    const violations: string[] = [];
    const data = hydrateEventData(raw);

    // 1. Check for URI Injection Violations using ValidationEngine.isDangerousUrl
    // Decode characters up to ten levels deep first to ensure obfuscated protocols are caught.
    const decodedDesc = SafeUrlPipeline.decodeObfuscation(data.description || '');
    const decodedLoc = SafeUrlPipeline.decodeObfuscation(data.location || '');

    // Strip control characters to align with SafeUrlPipeline's treatment of control chars inside URLs.
    const cleanDesc = decodedDesc.replace(SafeUrlPipeline.REGEX_CONTROL_CHARS, '');
    const cleanLoc = decodedLoc.replace(SafeUrlPipeline.REGEX_CONTROL_CHARS, '');

    const extractUris = (text: string): string[] => {
      const uris: string[] = [];
      const tokens = text.split(/\s+/);
      
      for (const token of tokens) {
        if (!token) continue;
        
        let searchIndex = 0;
        while (true) {
          const colonIndex = token.indexOf(':', searchIndex);
          if (colonIndex === -1) break;
          
          let startOfScheme = colonIndex;
          while (startOfScheme > searchIndex) {
            const char = token[startOfScheme - 1];
            if (/[a-zA-Z0-9+.-]/.test(char)) {
              startOfScheme--;
            } else {
              break;
            }
          }
          
          if (startOfScheme < colonIndex && /[a-zA-Z]/.test(token[startOfScheme])) {
            const uri = token.substring(startOfScheme);
            uris.push(uri);
          }
          
          searchIndex = colonIndex + 1;
        }
      }
      return uris;
    };

    const urls = [...extractUris(cleanDesc), ...extractUris(cleanLoc)];

    for (const u of urls) {
      if (ValidationEngine.isDangerousUrl(u)) {
        violations.push('URI_INJECTION_VIOLATION');
        break;
      }
    }

    // 2. Check for Missing Fields (EVENT_MISSING_SUMMARY, EVENT_MISSING_START)
    if (!data.title || !data.title.trim()) {
      violations.push('EVENT_MISSING_SUMMARY');
    }
    if (!data.startDate || !data.startDate.trim()) {
      violations.push('EVENT_MISSING_START');
    }

    // 3. Check for Chronological Consistency (EVENT_CHRONOLOGICAL_VIOLATION)
    if (data.startDate && data.endDate) {
      const cleanStart = data.startDate.replace(/;TZID=[^;:\s\n]+/i, '');
      const cleanEnd = data.endDate.replace(/;TZID=[^;:\s\n]+/i, '');
      const startSecs = new Date(cleanStart).getTime();
      const endSecs = new Date(cleanEnd).getTime();
      if (!Number.isNaN(startSecs) && !Number.isNaN(endSecs)) {
        if (endSecs < startSecs) {
          violations.push('EVENT_CHRONOLOGICAL_VIOLATION');
        }
      }
    }

    return violations;
  },
};