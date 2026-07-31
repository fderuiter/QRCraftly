import { describe, it, expect } from 'vitest';
import {
  foldString,
  unfoldString,
  splitCompoundField,
  formatEventDateTime,
  parseEventDateTime,
  escapeVCardEvent,
  unescapeVCardEvent,
} from './rfcHelper';

describe('RFC Helper utilities', () => {
  describe('Line folding and unfolding', () => {
    it('does not fold lines that are shorter than or equal to maxLength', () => {
      const short = 'Short line';
      expect(foldString(short, 20)).toBe('Short line');
    });

    it('folds long lines by inserting a space at the beginning of folded lines', () => {
      const long = 'This is a very long line that should definitely be folded by our utility';
      // fold at max 30 characters
      const folded = foldString(long, 30);
      expect(folded).toContain('\n ');
      const unfolded = unfoldString(folded);
      expect(unfolded).toBe(long);
    });

    it('preserves multi-line entries character-for-character after folding and unfolding', () => {
      const original = 'BEGIN:VCARD\nVERSION:3.0\nNOTE:This is an extremely long note field in the vCard that contains extensive details and formatted address lines and notes, and should fold across multiple lines safely per the RFC standard guidelines.\nEND:VCARD';
      const folded = foldString(original, 75);
      const unfolded = unfoldString(folded);
      expect(unfolded).toBe(original);
    });

    it('detects and uses LF and CRLF line endings accordingly', () => {
      const lfText = 'TITLE:An extremely long title that has more than seventy five characters to test folding';
      const foldedLf = foldString(lfText, 50);
      expect(foldedLf).toContain('\n ');
      expect(foldedLf).not.toContain('\r\n');

      const crlfText = 'TITLE:An extremely long title that has more than seventy five characters to test folding\r\nNOTE:Another long field';
      const foldedCrlf = foldString(crlfText, 50);
      expect(foldedCrlf).toContain('\r\n ');
    });
  });

  describe('splitCompoundField high-accuracy delimiter parsing', () => {
    it('splits standard compound fields correctly', () => {
      const parts = splitCompoundField('one;two;three');
      expect(parts).toEqual(['one', 'two', 'three']);
    });

    it('ignores escaped semicolons', () => {
      const parts = splitCompoundField('one\\;stillOne;two');
      expect(parts).toEqual(['one\\;stillOne', 'two']);
    });

    it('identifies unescaped semicolons even when preceded by an even number of backslashes', () => {
      // \\; represents an escaped backslash followed by an unescaped semicolon
      const parts = splitCompoundField('one\\\\;two');
      expect(parts).toEqual(['one\\\\', 'two']);
    });

    it('identifies escaped semicolons when preceded by an odd number of backslashes', () => {
      // \\\\\; represents two escaped backslashes followed by an escaped semicolon
      const parts = splitCompoundField('one\\\\\\;stillOne;two');
      expect(parts).toEqual(['one\\\\\\;stillOne', 'two']);
    });
  });

  describe('Timezone and UTC indicator preservation', () => {
    it('formats and parses local date-times without adjustments', () => {
      const dateStr = '2025-01-01T12:30';
      const formatted = formatEventDateTime(dateStr);
      expect(formatted.value).toBe('20250101T123000');
      expect(formatted.tzid).toBeUndefined();

      const parsed = parseEventDateTime(formatted.value);
      expect(parsed).toBe('2025-01-01T12:30');
    });

    it('formats and parses absolute UTC times accurately', () => {
      const dateStr = '2025-01-01T12:30Z';
      const formatted = formatEventDateTime(dateStr);
      // Since it is UTC, value ends with Z
      expect(formatted.value).toBe('20250101T123000Z');

      const parsed = parseEventDateTime(formatted.value);
      expect(parsed).toBe('2025-01-01T12:30Z');
    });

    it('formats and parses dates with regional timezone (TZID) indicators', () => {
      const dateStr = '2025-01-01T12:30;TZID=America/New_York';
      const formatted = formatEventDateTime(dateStr);
      expect(formatted.value).toBe('20250101T123000');
      expect(formatted.tzid).toBe('America/New_York');

      const parsed = parseEventDateTime(formatted.value, ';TZID=America/New_York');
      expect(parsed).toBe('2025-01-01T12:30;TZID=America/New_York');
    });

    it('formats dates with offset designations using UTC methods and Z suffix', () => {
      const dateStr = '2025-01-01T12:30-05:00';
      const formatted = formatEventDateTime(dateStr);
      // 12:30-05:00 is 17:30 UTC
      expect(formatted.value).toBe('20250101T173000Z');

      const parsed = parseEventDateTime(formatted.value);
      expect(parsed).toBe('2025-01-01T17:30Z');
    });

    it('handles empty, invalid and other edge cases for date formatting and parsing', () => {
      // Empty / undefined inputs
      expect(foldString('')).toBe('');
      expect(unfoldString('')).toBe('');
      expect(formatEventDateTime(undefined)).toEqual({ value: '' });
      expect(formatEventDateTime('')).toEqual({ value: '' });
      expect(parseEventDateTime('')).toBe('');

      // Invalid date formats
      expect(formatEventDateTime('invalid-date')).toEqual({ value: 'invalid-date' });
      expect(parseEventDateTime('not-matching-regex')).toBe('not-matching-regex');

      // keyParams without TZID
      expect(parseEventDateTime('20250101T123000', ';FOO=bar')).toBe('2025-01-01T12:30');

      // escapeVCardEvent and unescapeVCardEvent edge cases
      expect(escapeVCardEvent(undefined)).toBe('');
      expect(escapeVCardEvent('')).toBe('');
      expect(escapeVCardEvent('hello;world,testing\\backslashes\nand\rnewlines')).toBe('hello\\;world\\,testing\\\\backslashes\\nand\\nnewlines');

      expect(unescapeVCardEvent(undefined)).toBe('');
      expect(unescapeVCardEvent('')).toBe('');
      expect(unescapeVCardEvent('hello\\;world\\,testing\\\\backslashes\\nand\\nnewlines')).toBe('hello;world,testing\\backslashes\nand\nnewlines');
    });
  });
});
