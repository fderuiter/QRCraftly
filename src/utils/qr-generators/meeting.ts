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

import { MeetingData } from '../../types';
import { ValidationEngine } from '../../engine/ValidationEngine';

/**
 * Constructs the QR code string for a virtual meeting link.
 *
 * The encoded value is the sanitized meeting URL itself.
 * The calling component may separately parse the URL to display meeting details.
 *
 * @param data - The meeting data containing the URL.
 * @returns The meeting URL string, or an empty string if the URL is empty or dangerous.
 */
export const constructMeetingString = (data: MeetingData): string => {
  if (!data.url) return '';
  if (ValidationEngine.isDangerousUrl(data.url)) return '';
  return data.url.trim();
};

/**
 * Hydrates MeetingData from a raw string.
 */
export const hydrateMeetingData = (raw: string): MeetingData => {
  return {
    url: raw,
  };
};
