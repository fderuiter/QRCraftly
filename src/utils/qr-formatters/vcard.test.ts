import { describe, it, expect } from 'vitest';
import { constructVCardString, escapeVCardString, VCardData } from './vcard';

describe('VCard Formatter', () => {
  describe('constructVCardString', () => {
    const baseVCard: VCardData = {
      firstName: 'John',
      lastName: 'Doe',
      organization: 'Acme Corp',
      title: 'Engineer',
      phone: '1234567890',
      email: 'john@example.com',
      website: 'https://example.com',
      street: '123 Main St',
      city: 'Metropolis',
      country: 'USA'
    };

    it('constructs a valid VCard 3.0 string', () => {
      const result = constructVCardString(baseVCard);
      expect(result).toContain('BEGIN:VCARD');
      expect(result).toContain('VERSION:3.0');
      expect(result).toContain('N:Doe;John;;;');
      expect(result).toContain('FN:John Doe');
      expect(result).toContain('ORG:Acme Corp');
      expect(result).toContain('TITLE:Engineer');
      expect(result).toContain('TEL:1234567890');
      expect(result).toContain('EMAIL:john@example.com');
      expect(result).toContain('URL:https://example.com');
      expect(result).toContain('ADR:;;123 Main St;Metropolis;;;USA');
      expect(result).toContain('END:VCARD');
    });

    it('escapes special characters (comma, semicolon, backslash, newline)', () => {
      const trickyVCard: VCardData = {
        ...baseVCard,
        organization: 'Acme, Inc.',
        street: '123 Main St; Apt 4',
        // Note: Newlines in inputs might be tricky depending on how they are captured, but the util handles \n
        title: 'Senior\\Principal'
      };
      const result = constructVCardString(trickyVCard);

      // Comma escaped: Acme\, Inc.
      expect(result).toContain('ORG:Acme\\, Inc.');
      // Semicolon escaped: 123 Main St\; Apt 4
      expect(result).toContain('ADR:;;123 Main St\\; Apt 4;Metropolis;;;USA');
      // Backslash escaped: Senior\\Principal
      expect(result).toContain('TITLE:Senior\\\\Principal');
    });

    it('removes dangerous URLs from website field', () => {
      const dangerousVCard: VCardData = {
        ...baseVCard,
        website: 'javascript:alert(1)'
      };
      const result = constructVCardString(dangerousVCard);
      expect(result).toContain('URL:');
      expect(result).not.toContain('javascript:alert(1)');
    });
  });

  describe('escapeVCardString', () => {
    it('returns empty string for undefined', () => {
      expect(escapeVCardString(undefined)).toBe('');
    });
  });
});
