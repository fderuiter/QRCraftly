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

import { REGEX_STRICT_CONTROL_CHARS_STRIP } from './securityConstants';

export const SafeUrlPipeline = {
  REGEX_URL_UNSAFE_CHARS: /[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g,
  REGEX_CONTROL_CHARS: REGEX_STRICT_CONTROL_CHARS_STRIP,

  DANGEROUS_PROTOCOLS: [
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
  ],

  decodeHtmlEntities(str: string): string {
    return str.replace(/&#(?:[xX]([0-9a-fA-F]+)|([0-9]+));?/g, (_match, hex, dec) => {
      return String.fromCharCode(hex ? parseInt(hex, 16) : parseInt(dec, 10));
    }).replace(/&([a-zA-Z]+);?/g, (match, name) => {
      const namedEntities: Record<string, string> = {
          'colon': ':',
          'tab': '\t',
          'newline': '\n',
          'quot': '"',
          'amp': '&',
          'lt': '<',
          'gt': '>',
      };
      return namedEntities[name.toLowerCase()] || match;
    });
  },

  decodeObfuscation(url: string): string {
    let prev = '';
    let curr = url;
    let maxDepth = 10;
    
    while (prev !== curr && maxDepth > 0) {
      prev = curr;
      try {
        curr = decodeURIComponent(curr);
      } catch (_e) {
        // Ignored malformed
      }
      curr = this.decodeHtmlEntities(curr);
      maxDepth--;
    }
    return curr;
  },

  isDangerous(url: string | undefined): boolean {
    if (!url) return false;
    let decoded = this.decodeObfuscation(url);
    decoded = decoded.replace(this.REGEX_URL_UNSAFE_CHARS, '').toLowerCase();
    return this.DANGEROUS_PROTOCOLS.some(p => decoded.startsWith(p));
  },

  normalize(url: string | undefined): string {
    if (!url) return '';
    
    // Replace control and invisible characters but leave spaces for encoding.
    const noControl = url.replace(this.REGEX_CONTROL_CHARS, '');
    
    let parsed = '';
    try {
      parsed = new URL(noControl).href;
    } catch {
      try {
        if (!noControl.startsWith('/') && !noControl.startsWith('?')) {
          parsed = new URL(`http://${noControl}`).href;
        }
      } catch {}
    }

    if (parsed) {
      // after URL parsing, valid spaces were converted to %20.
      // Now we can strip all remaining spaces/whitespaces
      return parsed.replace(/\s+/g, '');
    }

    // Fallback: encodeURI, then strip remaining whitespace
    try {
      return encodeURI(noControl).replace(/\s+/g, '');
    } catch {
      return noControl.replace(/\s+/g, '');
    }
  }
};

/**
 * Normalizes a URL string to ensure it is valid and properly encoded.
 * Uses native URL API to handle spaces and missing protocols.
 */
export const normalizeUrl = (url: string | undefined): string => {
  return SafeUrlPipeline.normalize(url);
};
