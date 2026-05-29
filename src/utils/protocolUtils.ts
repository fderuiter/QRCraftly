import { REGEX_STRICT_CONTROL_CHARS, REGEX_PRESERVE_FORMAT_CONTROL_CHARS } from './security';
import { QRType } from '../types';

/**
 * Shared utility for escaping string values for specific protocols.
 */
export const ProtocolUtils = {
  /**
   * Escapes a value for MECARD/WIFI format.
   * Strips all strict control characters, escapes \ ; , " :
   */
  escapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(REGEX_STRICT_CONTROL_CHARS, '')
      .replace(/([\\;,":])/g, '\\$1');
  },

  /**
   * Unescapes a value from MECARD/WIFI format.
   */
  unescapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str.replace(/\\([\\;,":])/g, '$1');
  },

  /**
   * Escapes a value for vCard or iCalendar (VCARD/VEVENT) formats.
   * Strips format-breaking control chars, escapes backslashes, newlines, commas, and semicolons.
   */
  escapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/([;,])/g, '\\$1');
  },

  /**
   * Unescapes a value from vCard or iCalendar (VCARD/VEVENT) formats.
   */
  unescapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(/\\n/gi, '\n')
      .replace(/\\([;,])/g, '$1')
      .replace(/\\\\/g, '\\');
  },

  /**
   * Identifies the QRType protocol from a raw string.
   */
  identifyProtocol(raw: string): QRType | null {
    if (!raw) return null;
    
    // Check specific protocols first
    if (raw.startsWith('WIFI:')) return QRType.WIFI;
    if (raw.includes('BEGIN:VCARD')) return QRType.VCARD;
    if (raw.includes('BEGIN:VEVENT') || raw.includes('BEGIN:VCALENDAR')) return QRType.EVENT;
    if (raw.toLowerCase().startsWith('mailto:') || raw.startsWith('MATMSG:')) return QRType.EMAIL;
    if (raw.toLowerCase().startsWith('tel:')) return QRType.PHONE;
    if (raw.toLowerCase().startsWith('sms:') || raw.toLowerCase().startsWith('smsto:')) return QRType.SMS;
    if (raw.toLowerCase().startsWith('geo:')) return QRType.LOCATION;
    
    // Check payment networks
    if (/^(bitcoin|ethereum|litecoin|solana):/i.test(raw)) return QRType.PAYMENT;

    // Check meeting / social / url
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      
      // Socials
      if (host.includes('instagram.com') || host.includes('x.com') || host.includes('twitter.com') || host.includes('tiktok.com')) {
        return QRType.SOCIAL;
      }
      
      // Meetings
      if (host.includes('zoom.us') || host.includes('teams.microsoft.com') || host.includes('meet.google.com')) {
        return QRType.MEETING;
      }
      
      // General URL
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return QRType.URL;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Default to TEXT if no other protocol matches but there's content
    return QRType.TEXT;
  },

  /**
   * Returns true if a raw string can be hydrated into the target type.
   */
  canHydrate(raw: string, type: QRType): boolean {
    const identified = this.identifyProtocol(raw);
    if (identified === type) return true;
    
    // Fallback: anything can be hydrated into TEXT type
    if (type === QRType.TEXT) return true;
    
    return false;
  }
};
