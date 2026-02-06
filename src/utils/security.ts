/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 */
export const safeJsonLdStringify = (data: any): string => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
                             .replace(/>/g, '\\u003e')
                             .replace(/&/g, '\\u0026');
};

const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F\s]+/g;

const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'file:',
  'data:',
  'mk:',
];

/**
 * Checks if a URL string contains a dangerous protocol.
 * Dangerous protocols: javascript:, vbscript:, file:, data:, mk:
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
 * Sanitizes input by stripping query parameters.
 * Useful for preventing parameter injection in constructed URIs.
 */
export const sanitizeInput = (str: string): string => {
  return str.split('?')[0];
};
