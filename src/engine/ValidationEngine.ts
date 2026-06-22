import { QRConfig, QRType } from '../types';
import { getContrastRatio } from '../utils/colorUtils';

export const ValidationEngine = {
  // Shared regex patterns for data parsing and validation
  REGEX_STRICT_CONTROL_CHARS: /[\x00-\x1F\x7F-\x9F]+/g,
  REGEX_PRESERVE_FORMAT_CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g,
  REGEX_URL_UNSAFE_CHARS: /[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g,
  REGEX_ESCAPE_WIFI: /([\\;,":])/g,
  REGEX_UNESCAPE_WIFI: /\\([\\;,":])/g,
  REGEX_SPLIT_WIFI: /(?<!\\);/,
  REGEX_ESCAPE_VCARD: /([;,])/g,
  REGEX_UNESCAPE_VCARD: /\\([;,])/g,
  REGEX_SPLIT_VCARD: /(?<!\\);/,

  DANGEROUS_PROTOCOLS: [
    'javascript:',
    'vbscript:',
    'file:',
    'data:',
    'mk:',
    'blob:',
    'filesystem:',
    'jscript:',
    'wscript:',
    'mocha:',
    'about:',
  ],

  // Protocol Identification
  identifyProtocol(raw: string): QRType | null {
    if (!raw) return null;
    
    if (raw.startsWith('WIFI:')) return QRType.WIFI;
    if (raw.includes('BEGIN:VCARD')) return QRType.VCARD;
    if (raw.includes('BEGIN:VEVENT') || raw.includes('BEGIN:VCALENDAR')) return QRType.EVENT;
    if (raw.toLowerCase().startsWith('mailto:') || raw.startsWith('MATMSG:')) return QRType.EMAIL;
    if (raw.toLowerCase().startsWith('tel:')) return QRType.PHONE;
    if (raw.toLowerCase().startsWith('sms:') || raw.toLowerCase().startsWith('smsto:')) return QRType.SMS;
    if (raw.toLowerCase().startsWith('geo:')) return QRType.LOCATION;
    
    if (/^(bitcoin|ethereum|litecoin|solana):/i.test(raw)) return QRType.PAYMENT;

    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      
      const isDomain = (d: string) => host === d || host.endsWith(`.${d}`);
      if (isDomain('instagram.com') || isDomain('x.com') || isDomain('twitter.com') || isDomain('tiktok.com')) {
        return QRType.SOCIAL;
      }
      
      if (isDomain('zoom.us') || isDomain('teams.microsoft.com') || isDomain('meet.google.com')) {
        return QRType.MEETING;
      }
      
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return QRType.URL;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    return QRType.TEXT;
  },

  canHydrate(raw: string, type: QRType): boolean {
    const identified = this.identifyProtocol(raw);
    if (identified === type) return true;
    if (type === QRType.TEXT) return true;
    return false;
  },

  // Security sanitization
  isDangerousUrl(url: string | undefined): boolean {
    if (!url) return false;
    const normalized = url.replace(this.REGEX_URL_UNSAFE_CHARS, '').toLowerCase();
    return this.DANGEROUS_PROTOCOLS.some(p => normalized.startsWith(p));
  },

  sanitizeInput(str: string): string {
    const noControl = str.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
    return noControl.split('?')[0];
  },

  // Escaping logic
  escapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(this.REGEX_STRICT_CONTROL_CHARS, '')
      .replace(this.REGEX_ESCAPE_WIFI, '\\$1');
  },

  unescapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str.replace(this.REGEX_UNESCAPE_WIFI, '$1');
  },

  escapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(this.REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(this.REGEX_ESCAPE_VCARD, '\\$1');
  },

  unescapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(/\\n/gi, '\n')
      .replace(this.REGEX_UNESCAPE_VCARD, '$1')
      .replace(/\\\\/g, '\\');
  },

  // Scannability scoring heuristic
  calculateScannability(config: QRConfig): { score: number; warnings: string[] } {
    let score = 100;
    const warnings: string[] = [];

    const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
    const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
    const worstContrast = Math.min(fgContrast, eyeContrast);

    if (worstContrast < 3.0) {
      score -= 40;
      warnings.push("Contrast ratio is critically low");
    } else if (worstContrast < 4.5) {
      score -= 20;
      warnings.push("Contrast ratio is low");
    }

    const isComplex = ['grunge', 'circuit', 'starburst'].includes(config.style);
    if (isComplex) {
      score -= 10;
      if (worstContrast < 7.0) {
        score -= 20;
        warnings.push("Pattern complexity too high for current contrast");
      }
    }

    if (config.logoUrl) {
      if (config.logoSize > 0.3) {
        score -= 15;
        warnings.push("Logo size might obscure too much data");
      }
      if (config.errorCorrectionLevel === 'L') {
        score -= 15;
        warnings.push("Low error correction with logo");
      }
    }

    return { score: Math.max(0, Math.min(100, score)), warnings };
  }
};
