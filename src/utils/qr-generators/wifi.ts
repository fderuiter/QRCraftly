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

import { WifiData, WifiEncryption } from '../../types';
import { REGEX_STRICT_CONTROL_CHARS } from '../security';

/**
 * Escapes special characters for WiFi QR code string.
 * Characters to escape: \ ; , " :
 */
export const escapeWifiString = (str: string | undefined): string => {
  if (!str) return '';
  // Strip control characters including newlines (0x00-0x1F, 0x7F-0x9F)
  // because WiFi SSIDs and passwords generally shouldn't have them,
  // and they can break the MECARD/WIFI format or cause parsing issues.
  const cleaned = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return cleaned.replace(/([\\;,":])/g, '\\$1');
};

/**
 * Constructs the WiFi QR code string from the given data.
 */
export const unescapeWifiString = (str: string | undefined): string => {
  if (!str) return '';
  return str.replace(/\\([\\;,":])/g, '$1');
};

/**
 * Hydrates WifiData from a raw string.
 */
export const hydrateWifiData = (raw: string): WifiData => {
  const result: WifiData = {
    ssid: '',
    password: '',
    encryption: WifiEncryption.WPA,
    hidden: false,
    eapIdentity: '',
  };

  if (!raw.startsWith('WIFI:')) return result;

  const content = raw.substring(5).replace(/;+$/, '');
  const parts = content.split(/(?<!\\);/);

  parts.forEach(part => {
    const splitIndex = part.indexOf(':');
    if (splitIndex <= 0) return;
    const key = part.substring(0, splitIndex);
    const value = part.substring(splitIndex + 1);

    switch(key) {
      case 'S': result.ssid = unescapeWifiString(value); break;
      case 'P': result.password = unescapeWifiString(value); break;
      case 'T': 
        const enc = unescapeWifiString(value);
        if (Object.values(WifiEncryption).includes(enc as WifiEncryption)) {
          result.encryption = enc as WifiEncryption;
        }
        break;
      case 'H': result.hidden = value.toLowerCase() === 'true'; break;
      case 'I': result.eapIdentity = unescapeWifiString(value); break;
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
    `S:${escapeWifiString(data.ssid)}`,
  ];

  if (encryption === WifiEncryption.WPA2_EAP) {
    parts.push(`I:${escapeWifiString(data.eapIdentity)}`);
  }

  if (encryption !== WifiEncryption.NOPASS) {
    parts.push(`P:${escapeWifiString(data.password)}`);
  }

  // Explicitly cast hidden to boolean to prevent string injection
  parts.push(`H:${!!data.hidden}`);

  return `WIFI:${parts.join(';')};;`;
};
