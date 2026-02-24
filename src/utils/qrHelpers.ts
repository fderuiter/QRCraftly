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

import { WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, WifiEncryption, CryptoNetwork } from '../types';
import { isDangerousUrl, cleanPhoneNumber, sanitizeInput, REGEX_STRICT_CONTROL_CHARS, REGEX_PRESERVE_FORMAT_CONTROL_CHARS, REGEX_UNICODE_NEWLINES } from './security';

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

/**
 * Constructs the mailto string for Email QR code.
 */
export const constructEmailString = (data: EmailData): string => {
  // Sanitize email to prevent header injection (e.g. ?cc=attacker@example.com)
  const safeEmail = sanitizeInput(data.email);
  return `mailto:${safeEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
};

/**
 * Normalizes a URL string to ensure it is valid and properly encoded.
 * Uses native URL API to handle spaces and missing protocols.
 */
export const normalizeUrl = (url: string | undefined): string => {
  if (!url) return '';
  try {
    // 1. Try parsing as is (absolute URL)
    return new URL(url).href;
  } catch (e) {
    try {
      // 2. Try adding http:// (domain/path only)
      return new URL(`http://${url}`).href;
    } catch (e2) {
      // 3. Fallback: encodeURI (handles spaces but not protocol)
      try {
        return encodeURI(url);
      } catch (e3) {
        // 4. Absolute fallback
        return url;
      }
    }
  }
};

/**
 * Escapes special characters for vCard property values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeVCardString = (str: string | undefined): string => {
  if (!str) return '';
  // 1. Strip non-printable control characters (except newlines and tabs)
  // 2. Normalize Unicode line separators (U+2028, U+2029) to standard newlines
  // 3. Escape backslashes first to avoid double escaping
  // 4. Normalize and escape newlines (CRLF, CR, LF) as \n
  // 5. Escape commas and semicolons
  return str
    .replace(REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
    .replace(REGEX_UNICODE_NEWLINES, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/([;,])/g, '\\$1');
};

/**
 * Constructs the vCard 3.0 string.
 */
export const constructVCardString = (data: VCardData): string => {
  const lastName = escapeVCardString(data.lastName);
  const firstName = escapeVCardString(data.firstName);
  // Normalize URL first to handle spaces/protocols, then check for dangerous protocols on the normalized string
  const normalizedWebsite = normalizeUrl(data.website);
  const website = isDangerousUrl(normalizedWebsite) ? '' : escapeVCardString(normalizedWebsite);

  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${firstName} ${lastName}`,
    `ORG:${escapeVCardString(data.organization)}`,
    `TITLE:${escapeVCardString(data.title)}`,
    `TEL:${escapeVCardString(data.phone)}`,
    `EMAIL:${escapeVCardString(data.email)}`,
    `URL:${website}`,
    `ADR:;;${escapeVCardString(data.street)};${escapeVCardString(data.city)};;;${escapeVCardString(data.country)}`,
    'END:VCARD',
  ];

  return parts.join('\n');
};

/**
 * Constructs the tel string for Phone QR code.
 */
export const constructPhoneString = (data: PhoneData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  return `tel:${cleanNumber}`;
};

/**
 * Constructs the smsto string for SMS QR code.
 */
export const constructSmsString = (data: SmsData): string => {
  const cleanNumber = cleanPhoneNumber(data.number);
  const encodedBody = encodeURIComponent(data.message);
  return `sms:${cleanNumber}?body=${encodedBody}`;
};

/**
 * Constructs the crypto payment URI string.
 */
export const constructPaymentString = (data: PaymentData): string => {
  let paymentString = '';

  if (data.network === CryptoNetwork.CUSTOM) {
    if (isDangerousUrl(data.address)) {
      return '';
    }
    paymentString = data.address;
  } else {
    // Ensure network is a valid known network to prevent protocol injection
    const validNetworks = [
      CryptoNetwork.BITCOIN,
      CryptoNetwork.ETHEREUM,
      CryptoNetwork.SOLANA,
      CryptoNetwork.LITECOIN,
    ];

    if (!validNetworks.includes(data.network)) {
      return '';
    }

    // Sanitize address to prevent parameter injection if user accidentally pastes a full URI or malicious string
    const safeAddress = sanitizeInput(data.address);
    paymentString = `${data.network}:${safeAddress}`;
    const params: string[] = [];

    if (data.amount) {
      // Encode amount to prevent parameter injection
      params.push(`amount=${encodeURIComponent(data.amount)}`);
    }

    if (data.label) {
      params.push(`label=${encodeURIComponent(data.label)}`);
    }

    if (params.length > 0) {
      paymentString += `?${params.join('&')}`;
    }
  }
  return paymentString;
};
