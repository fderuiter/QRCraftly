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

import { SYSTEM_LIMITS } from '../constants';
import { SafeUrlPipeline } from './url';

/**
 * Safely serializes data for use in a JSON-LD script tag.
 * Escapes <, >, and & to prevent XSS via </script> injection.
 *
 * @param data The JSON-LD schema object to serialize.
 * @returns A safe, escaped JSON string representation of the data, or '{}' if undefined/invalid.
 */
export const safeJsonLdStringify = (data: any): string => {
  const str = JSON.stringify(data);
  if (!str) return '{}';

  return str.replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
};

/**
 * Shared regular expressions for security and formatting
 */
export const REGEX_STRICT_CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]+/g;
export const REGEX_PRESERVE_FORMAT_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
const REGEX_PHONE_STRIP = /[^0-9+*#\-().]/g;
const REGEX_PHONE_STRIP_PRESERVE = /[^0-9+*#\-().;,]/g;
const REGEX_SOCIAL_HANDLE_STRIP = /[^a-zA-Z0-9_.\-]/g;

/**
 * Checks whether the given URL contains dangerous schemes or matches suspicious patterns.
 * Directly calls the SafeUrlPipeline without any translation wrappers.
 *
 * @param url The input URL to evaluate.
 * @returns True if the URL is dangerous and should be blocked, false otherwise.
 */
export const isDangerousUrl = (url: string | undefined): boolean => {
  return SafeUrlPipeline.isDangerous(url);
};

/**
 * Sanitizes a plain input string by stripping control characters and cutting off query parameters.
 * Direct single-function implementation.
 *
 * @param str The raw user input string.
 * @returns The sanitized input string.
 */
export const sanitizeInput = (str: string): string => {
  const noControl = str.replace(REGEX_STRICT_CONTROL_CHARS, '');
  return noControl.split('?')[0];
};

/**
 * Removes all characters that are not digits or valid phone symbols (+, *, #, -, ., (, )).
 * This prevents injection of arbitrary characters into tel: or sms: URIs.
 *
 * @param number The phone number string to clean.
 * @param preserveSemicolonComma Whether to preserve semicolons and commas (for isolated configurations).
 * @returns The cleaned phone number string.
 */
export const cleanPhoneNumber = (number: string, preserveSemicolonComma: boolean = false): string => {
  if (preserveSemicolonComma) {
    return number.replace(REGEX_PHONE_STRIP_PRESERVE, '');
  }
  return number.replace(REGEX_PHONE_STRIP, '');
};

/**
 * Normalizes a social handle by stripping leading at signs and unsafe characters.
 *
 * @param handle The raw social handle.
 * @returns The sanitized and normalized social handle.
 */
export const sanitizeSocialHandle = (handle: string): string => {
  const withoutAt = handle.replace(/^@+/, '');
  return withoutAt.replace(REGEX_SOCIAL_HANDLE_STRIP, '');
};

/**
 * Validates an uploaded image file for size and type.
 * Enforces a size limit and allows specific formats based on system limits.
 * @param file The file to validate.
 * @returns A string with an error message if invalid, or null if valid.
 */
export const validateImageUpload = (file: File): string | null => {
  const MAX_SIZE = SYSTEM_LIMITS.MAX_FILE_UPLOAD_MB * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return `File size exceeds the ${SYSTEM_LIMITS.MAX_FILE_UPLOAD_MB}MB limit.`;
  }

  const allowedTypes = SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS;
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.';
  }

  return null;
};

/**
 * Common URL validation logic for both meeting and URL generators.
 *
 * @param raw The raw URL string.
 * @param urlContainmentProfile The regex to test.
 * @returns An array of security or structure violations.
 */
export const validateUrlAndInject = (raw: string, urlContainmentProfile: RegExp): string[] => {
  const violations: string[] = [];
  if (isDangerousUrl(raw)) {
    violations.push('URI_INJECTION_VIOLATION');
  } else if (!urlContainmentProfile.test(raw) && raw.startsWith('http')) {
    violations.push('URL_STRUCTURE_VIOLATION');
  }
  return violations;
};

/**
 * Sanitizes an SVG string to prevent DOM-XSS and structural XML injection.
 * Removes all script elements, script events, and external resource requests.
 * Standard presentation attributes, clip paths, linear gradients, and responsive viewBox configurations are allowed.
 *
 * @param svgText The raw, potentially unsafe SVG string.
 * @returns The sanitized, safe SVG string.
 */
export const sanitizeSvg = (svgText: string): string => {
  if (!svgText) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    // Traverse the document and sanitize
    const cleanNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // 1. Remove script blocks/elements
        if (tagName === 'script') {
          element.parentNode?.removeChild(element);
          return; // Node is removed, no need to process children or attributes
        }

        // 2. Remove script events (attributes starting with "on")
        const attrs = Array.from(element.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          if (attrName.startsWith('on')) {
            element.removeAttribute(attr.name);
          }
          // 3. Remove/neutralize external resource requests in href / xlink:href
          else if (attrName === 'href' || attrName === 'xlink:href') {
            const val = attr.value.trim();
            // Allow data URIs and local fragment links
            const isSafe = val.startsWith('data:') || val.startsWith('#') || val === '';
            if (!isSafe) {
              element.removeAttribute(attr.name);
            }
          }
          // 4. Sanitize inline style attribute for external resource requests (like url(http://...), @import)
          else if (attrName === 'style') {
            const styleVal = attr.value;
            let cleanStyle = styleVal.replace(/@import\s+[^;]+;/gi, '');
            cleanStyle = cleanStyle.replace(/url\s*\(\s*['"]?([^'")]*)['"]?\s*\)/gi, (match, urlContent) => {
              const trimmedUrl = urlContent.trim();
              if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('#') || trimmedUrl === '') {
                return match;
              }
              return 'url(#)';
            });
            element.setAttribute(attr.name, cleanStyle);
          }
        }

        // 5. Sanitize <style> elements
        if (tagName === 'style') {
          const styleContent = element.textContent || '';
          let cleanContent = styleContent.replace(/@import\s+[^;]+;/gi, '');
          cleanContent = cleanContent.replace(/url\s*\(\s*['"]?([^'")]*)['"]?\s*\)/gi, (match, urlContent) => {
            const trimmedUrl = urlContent.trim();
            if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('#') || trimmedUrl === '') {
              return match;
            }
            return 'url(#)';
          });
          element.textContent = cleanContent;
        }
      }

      // Recursively sanitize child nodes
      const children = Array.from(node.childNodes);
      for (const child of children) {
        cleanNode(child);
      }
    };

    cleanNode(doc.documentElement);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  } catch (error) {
    console.error('SVG sanitization failed:', error);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  }
};

