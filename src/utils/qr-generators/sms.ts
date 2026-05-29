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

import { SmsData } from '../../types';
import { cleanPhoneNumber } from '../security';

/**
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  const encodedBody = encodeURIComponent(data.message);
  return `sms:${cleanNumber}?body=${encodedBody}`;
};

/**
 * Hydrates SmsData from a raw string.
 */
export const hydrateSmsData = (raw: string): SmsData => {
  const result: SmsData = {
    number: '',
    message: '',
  };

  const isSms = raw.toLowerCase().startsWith('sms:');
  const isSmsto = raw.toLowerCase().startsWith('smsto:');

  if (isSms || isSmsto) {
    const prefixLen = isSms ? 4 : 6;
    const content = raw.substring(prefixLen);
    
    // Check for RFC 5724 format: sms:number?body=encodedBody
    const qMarkIndex = content.indexOf('?');
    if (qMarkIndex !== -1) {
      result.number = content.substring(0, qMarkIndex);
      const query = content.substring(qMarkIndex + 1);
      const params = new URLSearchParams(query);
      result.message = params.get('body') || '';
    } else {
      // Check for older smsto format: smsto:number:message
      const colonIndex = content.indexOf(':');
      if (colonIndex !== -1) {
        result.number = content.substring(0, colonIndex);
        result.message = content.substring(colonIndex + 1);
      } else {
        result.number = content;
      }
    }
  }

  return result;
};
