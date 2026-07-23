import { QRConfig, QRType } from '../types';
import { LOW_RELIABILITY_PATTERNS, SYSTEM_LIMITS } from '../constants';
import { getContrastRatio } from '../utils/colorUtils';
import { parseProtocol, PROTOCOL_PREFIXES, SOCIAL_DOMAINS } from '../utils/protocol';
import { SafeUrlPipeline } from '../utils/url';

/**
 * Core validation and sanitization engine for QR code generation.
 * Handles containment profiles, regex validation, protocol identification,
 * payload sanitization, and scannability heuristics.
 */
export const ValidationEngine = {
  /**
   * Formal containment profiles for validating structured text and emails.
   */
  CONTAINMENT_PROFILES: {
    URL: /^(?:https?|ftp):\/\/[^\s\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]+$/i,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PLAIN_TEXT: /^[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]*$/,
    // General check for zero-width and control characters in text fields
    STRICT_NO_CONTROL: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/
  },

  /**
   * Regular expression pattern to match strict control and zero-width characters.
   */
  REGEX_STRICT_CONTROL_CHARS: /[\x00-\x1F\x7F-\x9F]+/g,
  /**
   * Regular expression pattern to match format-preserving control characters.
   */
  REGEX_PRESERVE_FORMAT_CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g,
  /**
   * Regular expression pattern to match characters unsafe in a URL structure.
   */
  REGEX_URL_UNSAFE_CHARS: SafeUrlPipeline.REGEX_URL_UNSAFE_CHARS,
  /**
   * Regular expression pattern to match characters that need escaping in WIFI configurations.
   */
  REGEX_ESCAPE_WIFI: /([\\;,":])/g,
  /**
   * Regular expression pattern to match escaped WIFI characters for unescaping.
   */
  REGEX_UNESCAPE_WIFI: /\\([\\;,":])/g,
  /**
   * Regular expression pattern to split WIFI parameters avoiding escaped semicolons.
   */
  REGEX_SPLIT_WIFI: /(?<!\\);/,
  /**
   * Regular expression pattern to match characters that need escaping in vCard entries.
   */
  REGEX_ESCAPE_VCARD: /([;,])/g,
  /**
   * Regular expression pattern to match escaped vCard characters for unescaping.
   */
  REGEX_UNESCAPE_VCARD: /\\([;,])/g,
  /**
   * Regular expression pattern to split vCard parameters avoiding escaped semicolons.
   */
  REGEX_SPLIT_VCARD: /(?<!\\);/,

  /**
   * List of dangerous protocols that must be blocked for security.
   */
  DANGEROUS_PROTOCOLS: SafeUrlPipeline.DANGEROUS_PROTOCOLS,

  /**
   * Identifies the QR code type from the raw input payload string.
   * @param raw - The raw input payload string to identify.
   * @returns The identified QRType, or null if empty.
   */
  identifyProtocol(raw: string): QRType | null {
    if (!raw) return null;
    
    if (raw.startsWith('WIFI:')) return QRType.WIFI;
    if (raw.includes('BEGIN:VCARD')) return QRType.VCARD;
    if (raw.includes('BEGIN:VEVENT') || raw.includes('BEGIN:VCALENDAR')) return QRType.EVENT;
    if (/^(bitcoin|ethereum|litecoin|solana):/i.test(raw)) return QRType.PAYMENT;

    const parsed = parseProtocol(raw);
    
    if (parsed) {
      if (PROTOCOL_PREFIXES.MAIL.includes(parsed.scheme + ':')) return QRType.EMAIL;
      if (parsed.scheme === 'matmsg') return QRType.EMAIL;
      if (PROTOCOL_PREFIXES.TEL.includes(parsed.scheme + ':')) return QRType.PHONE;
      if (PROTOCOL_PREFIXES.SMS.includes(parsed.scheme + ':')) return QRType.SMS;
      if (parsed.scheme === 'geo') return QRType.LOCATION;

      if (parsed.scheme === 'http' || parsed.scheme === 'https') {
        const pathParts = parsed.path.split('/');
        let domain = pathParts[0].toLowerCase();
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        
        // Find if any known domain is a suffix of the current domain
        const knownSocial = Object.keys(SOCIAL_DOMAINS).find(d => domain === d || domain.endsWith(`.${d}`));
        if (knownSocial) {
          return QRType.SOCIAL;
        }

        const isDomain = (d: string) => domain === d || domain.endsWith(`.${d}`);
        if (isDomain('zoom.us') || isDomain('teams.microsoft.com') || isDomain('meet.google.com')) {
          return QRType.MEETING;
        }

        return QRType.URL;
      }
    }

    return QRType.TEXT;
  },

  /**
   * Verifies if a raw string can be successfully hydrated into the specified QR type.
   * @param raw - The raw QR code payload string.
   * @param type - The target QR code type.
   * @returns True if the payload can be hydrated, false otherwise.
   */
  canHydrate(raw: string, type: QRType): boolean {
    const identified = this.identifyProtocol(raw);
    if (identified === type) return true;
    if (type === QRType.TEXT) return true;
    return false;
  },

  /**
   * Checks whether the given URL contains dangerous schemes or matches suspicious patterns.
   * @param url - The input URL to evaluate, which may be undefined.
   * @returns True if the URL is dangerous and should be blocked, false otherwise.
   */
  isDangerousUrl(url: string | undefined): boolean {
    return SafeUrlPipeline.isDangerous(url);
  },

  /**
   * Performs full-scale validation on a complete QR configuration profile.
   * @param config - The QR code generation configuration profile.
   * @returns An array of security or structure violations.
   */
  validateConfig(config: QRConfig): string[] {
    const violations: string[] = [];

    // 1. Mandatory validation step for rendering sinks (borders, templates)
    const checkTextSink = (str: string | undefined, field: string) => {
      if (str && this.CONTAINMENT_PROFILES.STRICT_NO_CONTROL.test(str)) {
        violations.push(`${field} contains invalid control or zero-width characters`);
      }
    };

    checkTextSink(config.borderText, 'Border Text');
    checkTextSink(config.templateHeadline, 'Template Headline');
    checkTextSink(config.templateSubtext, 'Template Subtext');

    // 2. Validate QR payload against containment profiles
    if (config.value) {
      if (this.CONTAINMENT_PROFILES.STRICT_NO_CONTROL.test(config.value)) {
        violations.push('Payload contains invalid control or zero-width characters');
      }

      // Determine the effective type. Prefer explicit config.type, otherwise try to identify it.
      const type = config.type || this.identifyProtocol(config.value);

      if (type === QRType.URL || type === QRType.MEETING) {
        if (this.isDangerousUrl(config.value)) {
          violations.push('URI_INJECTION_VIOLATION');
        } else if (!this.CONTAINMENT_PROFILES.URL.test(config.value) && config.value.startsWith('http')) {
          violations.push('URL_STRUCTURE_VIOLATION');
        }
      } else if (type === QRType.EMAIL) {
        // If it starts with mailto:, extract and check the email part
        let emailPart = config.value;
        if (emailPart.toLowerCase().startsWith('mailto:')) {
          emailPart = emailPart.substring(7).split('?')[0];
        }
        if (!this.CONTAINMENT_PROFILES.EMAIL.test(emailPart)) {
          violations.push('EMAIL_STRUCTURE_VIOLATION');
        }
      } else if (type === QRType.VCARD) {
        // Extract website and check if dangerous
        const urlMatch = config.value.match(/^URL(?:;[^:]*)?:([^\r\n]+)/mi);
        if (urlMatch) {
          const vcardUrl = urlMatch[1].trim();
          if (this.isDangerousUrl(vcardUrl)) {
            violations.push('URI_INJECTION_VIOLATION');
          }
        }
      } else if (type === QRType.PAYMENT) {
        if (config.value && this.isDangerousUrl(config.value)) {
          violations.push('URI_INJECTION_VIOLATION');
        }
      }
    }

    return violations;
  },

  /**
   * Sanitizes all text-based fields inside a QR configuration by stripping control characters.
   * @param config - The original QR configuration object.
   * @returns A sanitized clone of the QR configuration.
   */
  sanitizeConfig(config: QRConfig): QRConfig {
    const clean = { ...config };
    if (clean.borderText) {
      clean.borderText = clean.borderText.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
    }
    if (clean.templateHeadline) {
      clean.templateHeadline = clean.templateHeadline.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
    }
    if (clean.templateSubtext) {
      clean.templateSubtext = clean.templateSubtext.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
    }
    if (clean.value) {
      const type = clean.type || this.identifyProtocol(clean.value);
      if (type === QRType.VCARD || type === QRType.EVENT) {
        clean.value = clean.value.replace(this.REGEX_PRESERVE_FORMAT_CONTROL_CHARS, '');
      } else {
        clean.value = clean.value.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
      }
    }
    return clean;
  },

  /**
   * Sanitizes a plain input string by stripping control characters and cutting off query parameters.
   * @param str - The raw user input string.
   * @returns The sanitized input string.
   */
  sanitizeInput(str: string): string {
    const noControl = str.replace(this.REGEX_STRICT_CONTROL_CHARS, '');
    return noControl.split('?')[0];
  },

  /**
   * Normalizes a social handle by stripping leading at signs and unsafe characters.
   * @param handle - The raw social handle.
   * @returns The sanitized and normalized social handle.
   */
  sanitizeSocialHandle(handle: string): string {
    const withoutAt = handle.replace(/^@+/, '');
    return withoutAt.replace(/[^a-zA-Z0-9_.\-]/g, '');
  },

  /**
   * Cleans a phone number by stripping any characters that are not digits, symbols, or formatting markers.
   * @param number - The raw phone number string.
   * @returns The cleaned phone number string.
   */
  cleanPhoneNumber(number: string): string {
    return number.replace(/[^0-9+*#\-().]/g, '');
  },

  /**
   * Escapes specific special characters in a WIFI SSID or password string.
   * @param str - The raw SSID or password string, which can be undefined.
   * @returns The escaped WIFI parameter string.
   */
  escapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str.replace(this.REGEX_ESCAPE_WIFI, '\\$1');
  },

  /**
   * Unescapes escaped special characters in a WIFI SSID or password string.
   * @param str - The escaped WIFI string, which can be undefined.
   * @returns The unescaped WIFI parameter string.
   */
  unescapeWifi(str: string | undefined): string {
    if (!str) return '';
    return str.replace(this.REGEX_UNESCAPE_WIFI, '$1');
  },

  /**
   * Escapes special characters and formats newlines for vCard and VEvent properties.
   * @param str - The raw field value string, which can be undefined.
   * @returns The escaped vCard/VEvent property string.
   */
  escapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(this.REGEX_ESCAPE_VCARD, '\\$1');
  },

  /**
   * Unescapes formatting and special characters in vCard or VEvent fields.
   * @param str - The escaped vCard/VEvent property string, which can be undefined.
   * @returns The restored raw field value string.
   */
  unescapeVCardEvent(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(/\\n/gi, '\n')
      .replace(this.REGEX_UNESCAPE_VCARD, '$1')
      .replace(/\\\\/g, '\\');
  },

  /**
   * Analyzes a QR configuration profile and returns a scannability score and recommendations.
   * @param config - The QR code generation configuration.
   * @returns An object containing the rating score and an array of scannability warning messages.
   */
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

    const isComplex = LOW_RELIABILITY_PATTERNS.includes(config.style as any);
    if (isComplex) {
      score -= 10;
      if (worstContrast < 7.0) {
        score -= 20;
        warnings.push("Pattern complexity too high for current contrast");
      }
    }

    if (config.logoUrl) {
      if (config.logoSize > SYSTEM_LIMITS.MAX_LOGO_SIZE) {
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
