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
import {
  escapeVCardEvent,
  unescapeVCardEvent,
  foldString,
  splitCompoundField,
  parseRFCProperties,
} from './rfcHelper';


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

  const properties = parseRFCProperties(raw);

  properties.forEach(({ key, value }) => {
    switch(key) {
      case 'N': {
        const nParts = splitCompoundField(value, ';');
        result.lastName = unescapeVCardEvent(nParts[0] || '');
        result.firstName = unescapeVCardEvent(nParts[1] || '');
        break;
      }
      case 'ORG': result.organization = unescapeVCardEvent(value); break;
      case 'TITLE': result.title = unescapeVCardEvent(value); break;
      case 'TEL': result.phone = unescapeVCardEvent(value); break;
      case 'EMAIL': result.email = unescapeVCardEvent(value); break;
      case 'URL': result.website = unescapeVCardEvent(value); break;
      case 'ADR': {
        const adrParts = splitCompoundField(value, ';');
        result.street = unescapeVCardEvent(adrParts[2] || '');
        result.city = unescapeVCardEvent(adrParts[3] || '');
        result.zip = unescapeVCardEvent(adrParts[5] || '');
        result.country = unescapeVCardEvent(adrParts[6] || '');
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
  const lastName = escapeVCardEvent(data.lastName);
  const firstName = escapeVCardEvent(data.firstName);
  // Normalize URL first to handle spaces/protocols
  const normalizedWebsite = normalizeUrl(data.website);
  const website = escapeVCardEvent(normalizedWebsite);

  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`,
    `ORG:${escapeVCardEvent(data.organization)}`,
    `TITLE:${escapeVCardEvent(data.title)}`,
    `TEL:${escapeVCardEvent(data.phone)}`,
    `EMAIL:${escapeVCardEvent(data.email)}`,
    `URL:${website}`,
    `ADR:;;${escapeVCardEvent(data.street)};${escapeVCardEvent(data.city)};;${escapeVCardEvent(data.zip)};${escapeVCardEvent(data.country)}`,
    'END:VCARD',
  ];

  return foldString(parts.join('\n'));
};

export const VCardContract: QRGeneratorContract<VCardData> = {
  type: QRType.VCARD,
  construct: constructVCardString,
  hydrate: hydrateVCardData,
  matches: (raw: string) => raw.includes('BEGIN:VCARD'),
  validate: (raw: string) => {
    const violations: string[] = [];
    const properties = parseRFCProperties(raw);
    for (const { key, value } of properties) {
      if (key === 'URL') {
        const vcardUrl = value.trim();
        if (ValidationEngine.isDangerousUrl(vcardUrl)) {
          violations.push('URI_INJECTION_VIOLATION');
          break;
        }
      }
    }
    return violations;
  },
};