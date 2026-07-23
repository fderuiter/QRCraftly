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

import { PhoneData, QRType, QRGeneratorContract } from '../../types';
import { parseProtocol } from '../protocol';
import { ValidationEngine } from '../../engine/ValidationEngine';

/**
 * Constructs the tel string for Phone QR code.
 */
export const constructPhoneString = (data: PhoneData): string => {
  const cleanNumber = ValidationEngine.cleanPhoneNumber(data.number);
  // nosemgrep: enforce-cleanphonenumber
  return `tel:${cleanNumber}`;
};

/**
 * Hydrates PhoneData from a raw string.
 */
export const hydratePhoneData = (raw: string): PhoneData => {
  const parsed = parseProtocol(raw);
  if (parsed && parsed.scheme === 'tel') {
    return { number: parsed.path };
  }
  return { number: '' };
};

export const PhoneContract: QRGeneratorContract<PhoneData> = {
  type: QRType.PHONE,
  construct: constructPhoneString,
  hydrate: hydratePhoneData,
  matches: (raw: string) => ValidationEngine.identifyProtocol(raw) === QRType.PHONE,
};