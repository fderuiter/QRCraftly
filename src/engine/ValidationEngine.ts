import { QRConfig, QRType } from '../types';
import {
  CONTAINMENT_PROFILES,
  identifyProtocol,
  canHydrate,
  validateConfig,
  sanitizeConfig,
  validatePayload,
} from '@/packages/qr-payload';
import { REGEX_STRICT_CONTROL_CHARS, REGEX_PRESERVE_FORMAT_CONTROL_CHARS } from '../utils/security';
import { SafeUrlPipeline } from '../utils/url';
import { calculateScannabilityHealth, type HealthScore } from '@/packages/scannability';

/**
 * Core validation and sanitization engine for QR code generation.
 * Handles containment profiles, regex validation, protocol identification,
 * payload sanitization, and scannability heuristics.
 *
 * Delegates payload validation, sanitization, and containment profiles to @/packages/qr-payload.
 */
export const ValidationEngine = {
  /**
   * Registry for type-specific validator functions to preserve backwards compatibility.
   */
  typeValidators: Object.create(null) as Record<string, (value: string) => string[]>,

  /**
   * Registers a validator function for a specific QRType.
   * Kept for backwards compatibility.
   * @param type - The QR code type to register.
   * @param validator - The validation function for the QRType.
   */
  registerValidator(type: QRType, validator: (value: string) => string[]) {
    this.typeValidators[type] = validator;
  },

  /**
   * Formal containment profiles for validating structured text and emails.
   */
  CONTAINMENT_PROFILES,

  /**
   * Regular expression pattern to match strict control and zero-width characters.
   */
  REGEX_STRICT_CONTROL_CHARS,

  /**
   * Regular expression pattern to match format-preserving control characters.
   */
  REGEX_PRESERVE_FORMAT_CONTROL_CHARS,

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
    return identifyProtocol(raw);
  },

  /**
   * Verifies if a raw string can be successfully hydrated into the specified QR type.
   * @param raw - The raw QR code payload string.
   * @param type - The target QR code type.
   * @returns True if the payload can be hydrated, false otherwise.
   */
  canHydrate(raw: string, type: QRType): boolean {
    return canHydrate(raw, type);
  },

  /**
   * Performs full-scale validation on a complete QR configuration profile.
   * @param config - The QR code generation configuration profile.
   * @returns An array of security or structure violations.
   */
  validateConfig(config: QRConfig): string[] {
    const violations = validateConfig(config);
    // If any custom validators were registered on typeValidators, run them as well
    if (config.value && config.type && this.typeValidators[config.type]) {
      const customViolations = this.typeValidators[config.type](config.value);
      if (customViolations && customViolations.length > 0) {
        violations.push(...customViolations);
      }
    }
    return violations;
  },

  /**
   * Validates an individual payload string against containment profiles and type-specific rules.
   * @param value - The raw QR payload string.
   * @param type - Optional known QRType.
   * @returns An array of security or structure violations.
   */
  validatePayload(value: string, type?: QRType): string[] {
    const violations = validatePayload(value, type);
    const effectiveType = type || identifyProtocol(value);
    if (effectiveType && this.typeValidators[effectiveType]) {
      const customViolations = this.typeValidators[effectiveType](value);
      if (customViolations && customViolations.length > 0) {
        violations.push(...customViolations);
      }
    }
    return Array.from(new Set(violations));
  },

  /**
   * Sanitizes all text-based fields inside a QR configuration by stripping control characters.
   * @param config - The original QR configuration object.
   * @returns A sanitized clone of the QR configuration.
   */
  sanitizeConfig(config: QRConfig): QRConfig {
    return sanitizeConfig(config);
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
  ): HealthScore {
    return calculateScannabilityHealth(config, localMetrics);
  },
};
