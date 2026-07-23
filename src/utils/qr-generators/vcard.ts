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

import { VCardData, QRType, QRGeneratorContract } from '../../types';
import { normalizeUrl } from '../url';
import { ValidationEngine } from '../../engine/ValidationEngine';

/**
 * Hydrates VCardData from a raw string.
 */
export const hydrateVCardData = (raw: string): VCardData => {
  const result: VCardData = {
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    zip: '',
    country: '',
  };

  if (!raw.includes('BEGIN:VCARD')) return result;

  const lines = raw.split(/\r\n|\r|\n/);

  lines.forEach(line => {
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) return;
    
    const fullKey = line.substring(0, splitIndex);
    const key = fullKey.split(';')[0].toUpperCase();
    const value = line.substring(splitIndex + 1);

    switch(key) {
      case 'N': {
        const nParts = value.split(ValidationEngine.REGEX_SPLIT_VCARD);
        result.lastName = ValidationEngine.unescapeVCardEvent(nParts[0] || '');
        result.firstName = ValidationEngine.unescapeVCardEvent(nParts[1] || '');
        break;
      }
      case 'ORG': result.organization = ValidationEngine.unescapeVCardEvent(value); break;
      case 'TITLE': result.title = ValidationEngine.unescapeVCardEvent(value); break;
      case 'TEL': result.phone = ValidationEngine.unescapeVCardEvent(value); break;
      case 'EMAIL': result.email = ValidationEngine.unescapeVCardEvent(value); break;
      case 'URL': result.website = ValidationEngine.unescapeVCardEvent(value); break;
      case 'ADR': {
        const adrParts = value.split(ValidationEngine.REGEX_SPLIT_VCARD);
        result.street = ValidationEngine.unescapeVCardEvent(adrParts[2] || '');
        result.city = ValidationEngine.unescapeVCardEvent(adrParts[3] || '');
        result.zip = ValidationEngine.unescapeVCardEvent(adrParts[5] || '');
        result.country = ValidationEngine.unescapeVCardEvent(adrParts[6] || '');
        break;
      }
    }
  });

  return result;
};

/**
 * Constructs the vCard 3.0 string.
 */
export const constructVCardString = (data: VCardData): string => {
  const lastName = ValidationEngine.escapeVCardEvent(data.lastName);
  const firstName = ValidationEngine.escapeVCardEvent(data.firstName);
  // Normalize URL first to handle spaces/protocols
  const normalizedWebsite = normalizeUrl(data.website);
  const website = ValidationEngine.escapeVCardEvent(normalizedWebsite);

  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`,
    `ORG:${ValidationEngine.escapeVCardEvent(data.organization)}`,
    `TITLE:${ValidationEngine.escapeVCardEvent(data.title)}`,
    `TEL:${ValidationEngine.escapeVCardEvent(data.phone)}`,
    `EMAIL:${ValidationEngine.escapeVCardEvent(data.email)}`,
    `URL:${website}`,
    `ADR:;;${ValidationEngine.escapeVCardEvent(data.street)};${ValidationEngine.escapeVCardEvent(data.city)};;${ValidationEngine.escapeVCardEvent(data.zip)};${ValidationEngine.escapeVCardEvent(data.country)}`,
    'END:VCARD',
  ];

  return parts.join('\n');
};

export const VCardContract: QRGeneratorContract<VCardData> = {
  type: QRType.VCARD,
  construct: constructVCardString,
  hydrate: hydrateVCardData,
  matches: (raw: string) => ValidationEngine.identifyProtocol(raw) === QRType.VCARD,
};