/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 */
export const safeJsonLdStringify = (data: any): string => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
                             .replace(/>/g, '\\u003e')
                             .replace(/&/g, '\\u0026');
};

// Includes standard control chars, unicode control chars (0080-009F), whitespace,
// and invisible chars like Zero Width Space (200B), ZWNJ (200C), ZWJ (200D), BOM (FEFF)
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g;

const DANGEROUS_PROTOCOLS = [
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
];

/**
 * Checks if a URL string contains a dangerous protocol.
 * Dangerous protocols: javascript:, vbscript:, file:, data:, mk:, blob:, filesystem:, jscript:, wscript:, mocha:, about:
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Remove control characters (00-1F, 7F-9F) and whitespace globally
  const normalized = url.replace(CONTROL_CHARS_REGEX, '').toLowerCase();

  return DANGEROUS_PROTOCOLS.some(p => normalized.startsWith(p));
};

/**
 * Removes spaces, colons, and URI control characters from a phone number string.
 */
export const cleanPhoneNumber = (number: string): string => {
  return number.replace(/[\s:?&=]+/g, '');
};

/**
 * Sanitizes input by stripping query parameters and control characters.
 * Useful for preventing parameter injection in constructed URIs and header injection.
 */
export const sanitizeInput = (str: string): string => {
  // Remove control characters (00-1F, 7F-9F) to prevent header injection
  const noControl = str.replace(/[\x00-\x1F\x7F-\x9F]+/g, '');
  return noControl.split('?')[0];
};
