import { QRConfig, QRType } from '../types';
import { LOW_RELIABILITY_PATTERNS, SYSTEM_LIMITS } from '../constants';
import { getContrastRatio } from '../utils/colorUtils';
import { parseProtocol, PROTOCOL_PREFIXES, SOCIAL_DOMAINS } from '../utils/protocol';
import { REGEX_STRICT_CONTROL_CHARS, REGEX_PRESERVE_FORMAT_CONTROL_CHARS } from '../utils/security';
import { SafeUrlPipeline } from '../utils/url';

/**
 * Core validation and sanitization engine for QR code generation.
 * Handles containment profiles, regex validation, protocol identification,
 * payload sanitization, and scannability heuristics.
 */
export const ValidationEngine = {
  /**
   * Registry for type-specific validator functions to avoid tight coupling.
   */
  typeValidators: Object.create(null) as Record<string, (value: string) => string[]>,

  /**
   * Registers a validator function for a specific QRType.
   * @param type - The QR code type to register.
   * @param validator - The validation function for the QRType.
   */
  registerValidator(type: QRType, validator: (value: string) => string[]) {
    this.typeValidators[type] = validator;
  },

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
  REGEX_STRICT_CONTROL_CHARS: REGEX_STRICT_CONTROL_CHARS,
  /**
   * Regular expression pattern to match format-preserving control characters.
   */
  REGEX_PRESERVE_FORMAT_CONTROL_CHARS: REGEX_PRESERVE_FORMAT_CONTROL_CHARS,
  /**
   * Regular expression pattern to match characters unsafe in a URL structure.
   */
  REGEX_URL_UNSAFE_CHARS: SafeUrlPipeline.REGEX_URL_UNSAFE_CHARS,

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
    
    if (raw.toLowerCase().startsWith('geo:')) return QRType.LOCATION;
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

      if (type) {
        let validator: ((value: string) => string[]) | undefined = undefined;
        switch (type) {
          case QRType.URL:
            validator = this.typeValidators[QRType.URL];
            break;
          case QRType.TEXT:
            validator = this.typeValidators[QRType.TEXT];
            break;
          case QRType.WIFI:
            validator = this.typeValidators[QRType.WIFI];
            break;
          case QRType.EVENT:
            validator = this.typeValidators[QRType.EVENT];
            break;
          case QRType.EMAIL:
            validator = this.typeValidators[QRType.EMAIL];
            break;
          case QRType.VCARD:
            validator = this.typeValidators[QRType.VCARD];
            break;
          case QRType.PHONE:
            validator = this.typeValidators[QRType.PHONE];
            break;
          case QRType.SMS:
            validator = this.typeValidators[QRType.SMS];
            break;
          case QRType.PAYMENT:
            validator = this.typeValidators[QRType.PAYMENT];
            break;
          case QRType.LOCATION:
            validator = this.typeValidators[QRType.LOCATION];
            break;
          case QRType.MEETING:
            validator = this.typeValidators[QRType.MEETING];
            break;
          case QRType.SOCIAL:
            validator = this.typeValidators[QRType.SOCIAL];
            break;
          default:
            break;
        }

        if (validator && typeof validator === 'function') {
          violations.push(...validator(config.value));
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
   * Analyzes a QR configuration profile and returns a scannability score and recommendations.
   * @param config - The QR code generation configuration.
   * @param localMetrics - Optional localized module contrast audit metrics.
   * @param localMetrics.violations - Count of local contrast violations.
   * @param localMetrics.minContrast - Minimum local contrast ratio.
   * @returns An object containing the rating score and an array of scannability warning messages.
   */
  calculateScannability(
    config: QRConfig,
    localMetrics?: { violations?: number; minContrast?: number }
  ): { score: number; warnings: string[] } {
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

    if (localMetrics && typeof localMetrics.violations === 'number' && localMetrics.violations > 0) {
      const deduction = Math.min(35, 15 + Math.floor(localMetrics.violations / 2));
      score -= deduction;
      warnings.push(`Local contrast drop detected across ${localMetrics.violations} module zone${localMetrics.violations > 1 ? 's' : ''}`);
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
