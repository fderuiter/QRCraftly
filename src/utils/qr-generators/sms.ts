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
import { parseProtocol } from '../protocol';

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

  const parsed = parseProtocol(raw);
  if (parsed && (parsed.scheme === 'sms' || parsed.scheme === 'smsto')) {
    result.number = parsed.path;
    result.message = parsed.params.get('body') || '';
  }

  return result;
};
