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

import { describe, it, expect } from 'vitest';
import { constructTextString, hydrateTextData } from './text';

describe('Text generator', () => {
  describe('constructTextString', () => {
    it('returns the text property from the input data', () => {
      const data = { text: 'Hello, World!' };
      expect(constructTextString(data)).toBe('Hello, World!');
    });

    it('handles empty string', () => {
      const data = { text: '' };
      expect(constructTextString(data)).toBe('');
    });

    it('handles special characters', () => {
      const data = { text: '!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./' };
      expect(constructTextString(data)).toBe('!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./');
    });

    it('handles multiline strings', () => {
      const data = { text: 'Line 1\nLine 2\r\nLine 3' };
      expect(constructTextString(data)).toBe('Line 1\nLine 2\r\nLine 3');
    });

    it('handles unicode characters', () => {
      const data = { text: '🔥 QR Craftly 🚀' };
      expect(constructTextString(data)).toBe('🔥 QR Craftly 🚀');
    });
  });

  describe('hydrateTextData', () => {
    it('wraps a raw string into a TextData object', () => {
      const raw = 'Simple text';
      expect(hydrateTextData(raw)).toEqual({ text: 'Simple text' });
    });

    it('handles empty string hydration', () => {
      expect(hydrateTextData('')).toEqual({ text: '' });
    });
  });
});
