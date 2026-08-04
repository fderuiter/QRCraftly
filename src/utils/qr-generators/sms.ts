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

import { SmsData, QRType, QRGeneratorContract } from '../../types';
import { parseProtocol } from '../protocol';
import { ValidationEngine } from '../../engine/ValidationEngine';

/**
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = ValidationEngine.cleanPhoneNumber(data.number, true);
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

export const SmsContract: QRGeneratorContract<SmsData> = {
  type: QRType.SMS,
  construct: constructSmsString,
  hydrate: hydrateSmsData,
  matches: (raw: string) => ValidationEngine.identifyProtocol(raw) === QRType.SMS,
  validate: (raw: string) => {
    const violations: string[] = [];
    const parsed = parseProtocol(raw);
    if (parsed && (parsed.scheme === 'sms' || parsed.scheme === 'smsto')) {
      const numberPart = parsed.path;
      if (/[a-zA-Z]/.test(numberPart) || /[^0-9+*#\-().;,\s]/.test(numberPart) || /[\r\n]/.test(numberPart)) {
        violations.push('SMS_PHONE_STRUCTURE_VIOLATION');
      }
    }
    return violations;
  },
};