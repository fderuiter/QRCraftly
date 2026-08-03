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

import { WifiData, WifiEncryption, QRType, QRGeneratorContract } from '../../types';

const REGEX_ESCAPE_WIFI = /([\\;,":])/g;
const REGEX_UNESCAPE_WIFI = /\\([\\;,":])/g;
const REGEX_PROHIBITED_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;

/**
 * Escapes specific special characters in a WIFI SSID or password string.
 * @param str - The raw SSID or password string, which can be undefined.
 * @returns The escaped WIFI parameter string.
 */
const escapeWifi = (str: string | undefined): string => {
  if (!str) return '';
  return str.replace(REGEX_ESCAPE_WIFI, '\\$1');
};

/**
 * Unescapes escaped special characters in a WIFI SSID or password string.
 * @param str - The escaped WIFI string, which can be undefined.
 * @returns The unescaped WIFI parameter string.
 */
const unescapeWifi = (str: string | undefined): string => {
  if (!str) return '';
  return str.replace(REGEX_UNESCAPE_WIFI, '$1');
};

/**
 * Hydrates WifiData from a raw string.
 */
export const hydrateWifiData = (raw: string): WifiData => {
  if (REGEX_PROHIBITED_CHARS.test(raw)) {
    throw new Error('Payload contains prohibited control or zero-width characters');
  }

  const result: WifiData = {
    ssid: '',
    password: '',
    encryption: WifiEncryption.WPA,
    hidden: false,
    eapIdentity: '',
  };

  if (!raw.startsWith('WIFI:')) return result;

  let content = raw.substring(5);
  if (content.endsWith(';;')) {
    content = content.slice(0, -2);
  } else if (content.endsWith(';')) {
    content = content.slice(0, -1);
  }
  
  const parts: string[] = [];
  let currentPart = '';
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escaped) {
      currentPart += char;
      escaped = false;
    } else if (char === '\\') {
      currentPart += char;
      escaped = true;
    } else if (char === ';') {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart);

  parts.forEach(part => {
    const splitIndex = part.indexOf(':');
    if (splitIndex <= 0) return;
    const key = part.substring(0, splitIndex);
    const value = part.substring(splitIndex + 1);

    switch(key) {
      case 'S': result.ssid = unescapeWifi(value); break;
      case 'P': result.password = unescapeWifi(value); break;
      case 'T': 
        const enc = unescapeWifi(value);
        if (Object.values(WifiEncryption).includes(enc as WifiEncryption)) {
          result.encryption = enc as WifiEncryption;
        }
        break;
      case 'H': result.hidden = value.toLowerCase() === 'true'; break;
      case 'I': result.eapIdentity = unescapeWifi(value); break;
    }
  });

  return result;
};

export const constructWifiString = (data: WifiData): string => {

  // Validate encryption type to prevent injection
  const encryption = Object.values(WifiEncryption).includes(data.encryption)
    ? data.encryption
    : WifiEncryption.WPA;

  const parts = [
    `T:${encryption}`,
    `S:${escapeWifi(data.ssid)}`,
  ];

  if (encryption === WifiEncryption.WPA2_EAP) {
    parts.push(`I:${escapeWifi(data.eapIdentity)}`);
  }

  if (encryption !== WifiEncryption.NOPASS) {
    parts.push(`P:${escapeWifi(data.password)}`);
  }

  // Only include hidden flag if true, as some scanners fail on H:false
  if (data.hidden) {
    parts.push(`H:true`);
  }

  return `WIFI:${parts.join(';')};;`;
};

export const WifiContract: QRGeneratorContract<WifiData> = {
  type: QRType.WIFI,
  construct: constructWifiString,
  hydrate: hydrateWifiData,
  matches: (raw: string) => raw.startsWith('WIFI:'),
  validate: () => [],
};
