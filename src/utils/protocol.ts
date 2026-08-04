import { SocialPlatform } from '../types';

export const SOCIAL_DOMAINS: Record<string, SocialPlatform> = {
  'instagram.com': SocialPlatform.INSTAGRAM,
  'x.com': SocialPlatform.TWITTER,
  'twitter.com': SocialPlatform.TWITTER,
  'tiktok.com': SocialPlatform.TIKTOK,
};

export const PROTOCOL_PREFIXES = {
  WEB: ['http://', 'https://'],
  MAIL: ['mailto:', 'matmsg:'],
  SMS: ['sms:', 'smsto:'],
  TEL: ['tel:'],
};

interface ParsedProtocol {
  scheme: string; // The protocol scheme without colon, e.g., 'mailto', 'sms', 'matmsg', 'http'
  path: string; // The target (email, phone, domain, etc.)
  params: Map<string, string>; // Query parameters or matmsg parts
}

/**
 * Safely parses a URI string into its scheme, path, and parameters.
 * Designed to prevent application crashes from malformed input.
 * Does not convert non-web protocols into HTTP URLs.
 */
export const parseProtocol = (raw: string): ParsedProtocol | null => {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Special case for MATMSG which uses semicolons and a different format
    if (trimmed.toUpperCase().startsWith('MATMSG:')) {
      const content = trimmed.substring(7);
      
      // Helper to split by unescaped semicolons (avoiding splitting on \;)
      const splitByUnescapedSemicolons = (str: string): string[] => {
        const result: string[] = [];
        let current = '';
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === ';') {
            let backslashCount = 0;
            let j = i - 1;
            while (j >= 0 && str[j] === '\\') {
              backslashCount++;
              j--;
            }
            if (backslashCount % 2 === 0) {
              result.push(current);
              current = '';
            } else {
              current += ';';
            }
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const segments = splitByUnescapedSemicolons(content);
      
      // Pop empty/whitespace-only segments from the end
      while (segments.length > 0 && segments[segments.length - 1].trim() === '') {
        segments.pop();
      }

      const KNOWN_MATMSG_KEYS = new Set(['TO', 'SUB', 'BODY']);
      const params = new Map<string, string>();
      let path = '';

      let activeKey: string | null = null;
      let activeValue = '';

      const flushActive = () => {
        if (activeKey !== null) {
          const unescapedValue = activeValue.replace(/\\;/g, ';');
          if (activeKey === 'TO') {
            path = unescapedValue;
          } else {
            params.set(activeKey, unescapedValue);
          }
        }
      };

      for (const segment of segments) {
        const colonIndex = segment.indexOf(':');
        let parsedKeyVal: { key: string; value: string } | null = null;
        if (colonIndex > 0) {
          const potentialKey = segment.substring(0, colonIndex).toUpperCase();
          if (KNOWN_MATMSG_KEYS.has(potentialKey)) {
            parsedKeyVal = { key: potentialKey, value: segment.substring(colonIndex + 1) };
          }
        }

        if (parsedKeyVal !== null) {
          flushActive();
          activeKey = parsedKeyVal.key;
          activeValue = parsedKeyVal.value;
        } else {
          if (activeKey !== null && activeKey !== 'TO') {
            activeValue += ';' + segment;
          }
        }
      }
      flushActive();

      return { scheme: 'matmsg', path, params };
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      return null;
    }

    const scheme = trimmed.substring(0, colonIdx).toLowerCase();
    const content = trimmed.substring(colonIdx + 1);
    
    // For sms with older smsto format: smsto:number:message
    if (scheme === 'smsto') {
      const colonIndex = content.indexOf(':');
      if (colonIndex !== -1) {
        const path = content.substring(0, colonIndex);
        const message = content.substring(colonIndex + 1);
        const params = new Map<string, string>();
        params.set('body', message);
        return { scheme, path, params };
      }
    }

    let path = content;
    let query = '';
    
    const qIdx = content.indexOf('?');
    if (qIdx !== -1) {
      path = content.substring(0, qIdx);
      query = content.substring(qIdx + 1);
    }
    
    // Clean up path for standard urls (remove //)
    if ((scheme === 'http' || scheme === 'https') && path.startsWith('//')) {
      path = path.substring(2);
    }

    const params = new Map<string, string>();
    if (query) {
      try {
        const urlParams = new URLSearchParams(query);
        urlParams.forEach((value, key) => {
          params.set(key, value);
        });
      } catch (_e) {
        // Ignore params if URLSearchParams crashes on malformed query
      }
    }

    return {
      scheme,
      path,
      params
    };
  } catch (_e) {
    // Proactive validation failure: catch all errors to prevent crashes
    return null;
  }
};
