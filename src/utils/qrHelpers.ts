import { WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, WifiEncryption, CryptoNetwork } from '../types';
import { isDangerousUrl, cleanPhoneNumber, sanitizeInput } from './security';

/**
 * Escapes special characters for WiFi QR code string.
 * Characters to escape: \ ; , " :
 */
export const escapeWifiString = (str: string | undefined): string => {
  if (!str) return '';
  return str.replace(/([\\;,":])/g, '\\$1');
};

/**
 * Constructs the WiFi QR code string from the given data.
 */
export const constructWifiString = (data: WifiData): string => {
  const parts = [
    `T:${data.encryption}`,
    `S:${escapeWifiString(data.ssid)}`,
  ];

  if (data.encryption === WifiEncryption.WPA2_EAP) {
    parts.push(`I:${escapeWifiString(data.eapIdentity)}`);
  }

  if (data.encryption !== WifiEncryption.NOPASS) {
    parts.push(`P:${escapeWifiString(data.password)}`);
  }

  parts.push(`H:${data.hidden}`);

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
 * Escapes special characters for vCard property values.
 * Characters to escape: \ ; , and newlines.
 */
export const escapeVCardString = (str: string | undefined): string => {
  if (!str) return '';
  // 1. Escape backslashes first to avoid double escaping
  // 2. Normalize and escape newlines (CRLF, CR, LF) as \n
  // 3. Escape commas and semicolons
  return str
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
  const website = isDangerousUrl(data.website) ? '' : escapeVCardString(data.website);

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
