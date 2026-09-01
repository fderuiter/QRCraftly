/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Default fallback domain for canonical URLs and origins
 */
const DEFAULT_EDGE_DOMAIN = 'https://qrcraftly.com';

/**
 * Escapes HTML entity meta-characters to prevent script injection in head elements.
 * Converts &, <, >, ", and ' to standard HTML entities.
 *
 * @param str The raw input string to escape.
 * @returns The safely HTML-escaped string.
 */
export const escapeMetadata = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return '';
  const input = String(str);
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Safely serializes structured JSON-LD data for embedded script tags.
 * Replaces angle brackets and ampersands with Unicode escape sequences (\u003c, \u003e, \u0026)
 * to prevent closing script tag injection while maintaining strict JSON specification compliance.
 *
 * @param data The JSON-LD schema object or string to serialize.
 * @returns A safe Unicode-escaped JSON string.
 */
export const serializeJsonLd = (data: unknown): string => {
  if (data === undefined || data === null) return '{}';

  let jsonStr = '';
  if (typeof data === 'string') {
    jsonStr = data;
  } else {
    try {
      jsonStr = JSON.stringify(data);
    } catch {
      return '{}';
    }
  }

  if (!jsonStr) return '{}';

  return jsonStr
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
};

/**
 * Validates and sanitizes dynamic canonical URLs against protocol and structural rules.
 * Enforces http: or https: schemes and strips control characters.
 *
 * @param rawUrl The raw URL candidate string.
 * @param fallbackDomain The fallback domain to use if rawUrl is invalid.
 * @returns A validated, sanitized URL string.
 */
export const validateAndSanitizeUrl = (
  rawUrl: string | undefined | null,
  fallbackDomain = DEFAULT_EDGE_DOMAIN
): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallbackDomain;
  }

  // Strip control characters
  const cleanUrl = rawUrl.replace(/[\x00-\x1F\x7F-\x9F]+/g, '').trim();
  if (!cleanUrl) {
    return fallbackDomain;
  }

  try {
    const parsed = new URL(cleanUrl, fallbackDomain);
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== 'http:' && scheme !== 'https:') {
      return fallbackDomain;
    }
    return parsed.href;
  } catch {
    return fallbackDomain;
  }
};

/**
 * Validates and sanitizes dynamic request origin headers or URL origins.
 * Enforces http: or https: schemes.
 *
 * @param rawOrigin The raw origin candidate string.
 * @param fallbackOrigin The fallback origin if rawOrigin is invalid.
 * @returns A validated, sanitized origin string.
 */
export const validateAndSanitizeOrigin = (
  rawOrigin: string | undefined | null,
  fallbackOrigin = DEFAULT_EDGE_DOMAIN
): string => {
  if (!rawOrigin || typeof rawOrigin !== 'string') {
    return fallbackOrigin;
  }

  const cleanOrigin = rawOrigin.replace(/[\x00-\x1F\x7F-\x9F]+/g, '').trim();
  if (!cleanOrigin) {
    return fallbackOrigin;
  }

  try {
    const parsed = new URL(cleanOrigin);
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== 'http:' && scheme !== 'https:') {
      return fallbackOrigin;
    }
    return parsed.origin;
  } catch {
    return fallbackOrigin;
  }
};

/**
 * Validates a canonical URL and escapes it for safe attribute insertion (e.g. href or content).
 *
 * @param rawUrl The raw URL candidate string.
 * @param fallbackDomain The fallback domain if rawUrl is invalid.
 * @returns An HTML attribute-escaped, validated URL string.
 */
export const sanitizeCanonicalUrl = (
  rawUrl: string | undefined | null,
  fallbackDomain = DEFAULT_EDGE_DOMAIN
): string => {
  const safeUrl = validateAndSanitizeUrl(rawUrl, fallbackDomain);
  return escapeMetadata(safeUrl);
};

/**
 * Options for rendering edge fallback HTML markup.
 */
export interface EdgeFallbackOptions {
  /** The requested pathname. */
  pathname: string;
  /** The request URL object or string. */
  url: URL | string;
  /** Metadata object containing title and description. */
  meta: {
    title: string;
    description: string;
  };
}

/**
 * Renders server-side fallback HTML markup for edge routes.
 * Ensures all dynamic metadata, canonical URLs, request origins, and JSON-LD script blocks
 * are processed through edge security sanitization utilities.
 *
 * @param options The fallback options including pathname, url, and metadata.
 * @returns The sanitized, safe HTML markup string.
 */
export const renderEdgeFallbackHtml = (options: EdgeFallbackOptions): string => {
  const { pathname, url: reqUrl, meta } = options;

  let requestUrl: URL;
  if (typeof reqUrl === 'string') {
    try {
      requestUrl = new URL(reqUrl, DEFAULT_EDGE_DOMAIN);
    } catch {
      requestUrl = new URL(DEFAULT_EDGE_DOMAIN);
    }
  } else {
    requestUrl = reqUrl;
  }

  const safeOrigin = validateAndSanitizeOrigin(requestUrl.origin);
  const fullRawUrl = safeOrigin + pathname;
  const safeCanonicalUrl = sanitizeCanonicalUrl(fullRawUrl);

  const safeTitle = escapeMetadata(meta.title);
  const safeDescription = escapeMetadata(meta.description);

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'QRCraftly',
    url: safeOrigin,
  };
  const safeJsonLd = serializeJsonLd(jsonLdData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}"/>
  <link rel="canonical" href="${safeCanonicalUrl}"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDescription}"/>
  <meta property="og:url" content="${safeCanonicalUrl}"/>
  <script type="application/ld+json">
    ${safeJsonLd}
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
};
