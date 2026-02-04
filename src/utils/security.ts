
/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 */
export const safeJsonLdStringify = (data: any): string => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
                             .replace(/>/g, '\\u003e')
                             .replace(/&/g, '\\u0026');
};

/**
 * Checks if a URL string contains a dangerous protocol.
 * Dangerous protocols: javascript:, vbscript:, file:, data:, mk:
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Remove control characters (00-1F, 7F-9F) and whitespace from the start
  const normalized = url.replace(/[\x00-\x1F\x7F-\x9F\s]+/g, '').toLowerCase();

  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'file:',
    'data:',
    'mk:',
  ];

  return dangerousProtocols.some(p => normalized.startsWith(p));
};

/**
 * Cleans a phone number string by removing potentially dangerous characters.
 * Allows digits, +, -, (, ), ., *, #, and ,
 * Strips everything else to prevent parameter injection (e.g. ?body=)
 */
export const cleanPhoneNumber = (number: string): string => {
  return number.replace(/[^0-9+\-().*#,]/g, '');
};
