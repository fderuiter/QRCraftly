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

/**
 * Core validation and sanitization engine for QR code generation.
 * Handles containment profiles, regex validation, protocol identification,
 * and payload sanitization. Scannability Health scoring lives in @/packages/scannability.
 *
 * Delegates payload validation, sanitization, and containment profiles to @/packages/qr-payload.
 */
export const ValidationEngine = {
  /**
   * Registry for type-specific validator functions to preserve backwards compatibility.
   */
  typeValidators: new Map<string, (value: string) => string[]>(),

  /**
   * Registers a validator function for a specific QRType.
   * Kept for backwards compatibility.
   * @param type - The QR code type to register.
   * @param validator - The validation function for the QRType.
   */
  registerValidator(type: QRType, validator: (value: string) => string[]) {
    this.typeValidators.set(type, validator);
  },

  /**
   * Runs the custom validator registered for a type, if any.
   * Only validators registered via registerValidator are dispatched.
   * @param type - The QR code type whose validator should run.
   * @param value - The raw QR payload string.
   * @returns Violations reported by the custom validator, or an empty array.
   */
  runCustomValidator(type: string, value: string): string[] {
    const validator = this.typeValidators.get(type);
    return typeof validator === 'function' ? validator(value) : [];
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
    if (config.value && config.type) {
      const customViolations = this.runCustomValidator(config.type, config.value);
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
    if (effectiveType) {
      const customViolations = this.runCustomValidator(effectiveType, value);
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
  }
};
