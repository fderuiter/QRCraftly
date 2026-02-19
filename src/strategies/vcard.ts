import { VCardData } from '../types';
import { VCardInput } from '../components/inputs/VCardInput';
import { isDangerousUrl, REGEX_PRESERVE_FORMAT_CONTROL_CHARS } from '../utils/security';

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
  // 2. Escape backslashes first to avoid double escaping
  // 3. Normalize and escape newlines (CRLF, CR, LF) as \n
  // 4. Escape commas and semicolons
  return str
    .replace(REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
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

export const VCardStrategy = {
  initialState: { firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '', street: '', city: '', country: '' } as VCardData,
  constructString: constructVCardString,
  InputComponent: VCardInput,
};
