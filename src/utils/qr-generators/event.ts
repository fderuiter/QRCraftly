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

import { EventData } from '../../types';
import { REGEX_PRESERVE_FORMAT_CONTROL_CHARS } from '../security';

/**
 * Escapes special characters for iCalendar text values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeEventString = (str: string | undefined): string => {
  if (!str) return '';
  return str
    .replace(REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');
};

/**
 * Formats an ISO datetime string (from datetime-local) into iCalendar local datetime.
 * Output format: YYYYMMDDTHHMMSS
 */
export const formatEventDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

export const unescapeEventString = (str: string | undefined): string => {
  if (!str) return '';
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\([;,])/g, '$1')
    .replace(/\\\\/g, '\\');
};

export const parseEventDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  // format: YYYYMMDDTHHMMSS
  const match = dateString.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  }
  return dateString;
};

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

  const lines = raw.split(/\r\n|\r|\n/);
  lines.forEach(line => {
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) return;
    
    const fullKey = line.substring(0, splitIndex);
    const key = fullKey.split(';')[0].toUpperCase();
    const value = line.substring(splitIndex + 1);

    switch(key) {
      case 'SUMMARY': result.title = unescapeEventString(value); break;
      case 'DTSTART': result.startDate = parseEventDateTime(value); break;
      case 'DTEND': result.endDate = parseEventDateTime(value); break;
      case 'LOCATION': result.location = unescapeEventString(value); break;
      case 'DESCRIPTION': result.description = unescapeEventString(value); break;
    }
  });

  return result;
};

/**
 * Constructs an iCalendar VEVENT payload.
 */
export const constructEventString = (data: EventData): string => {
  const parts = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QRCraftly//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeEventString(data.title)}`,
    `DTSTART:${formatEventDateTime(data.startDate)}`,
    `DTEND:${formatEventDateTime(data.endDate)}`,
    `LOCATION:${escapeEventString(data.location)}`,
    `DESCRIPTION:${escapeEventString(data.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return parts.join('\n');
};
