import { describe, it, expect } from 'vitest';
import {
  escapeVCardString,
  constructEmailString,
  constructVCardString,
  constructPaymentString
} from './qrHelpers';
import { EmailData, VCardData, PaymentData } from '../types';

describe('QR Helpers Sad Paths', () => {
  describe('escapeVCardString', () => {
    it('should normalize CRLF to \\n', () => {
      const input = 'Line 1\r\nLine 2';
      const result = escapeVCardString(input);
      expect(result).toBe('Line 1\\nLine 2');
    });

    it('should normalize CR to \\n', () => {
      const input = 'Line 1\rLine 2';
      const result = escapeVCardString(input);
      expect(result).toBe('Line 1\\nLine 2');
    });

    it('should handle mixed newline types', () => {
      const input = 'Win\r\nMac\rUnix\n';
      const result = escapeVCardString(input);
      expect(result).toBe('Win\\nMac\\nUnix\\n');
    });
  });

  describe('constructEmailString', () => {
    it('should handle empty string after sanitization', () => {
      const data: EmailData = {
        email: '?subject=bad',
        subject: 'Test',
        body: 'Body'
      };
      // Current behavior: mailto:?subject=Test...
      // This is technically valid URI but likely not what was intended if email became empty.
      // However, it's safe.
      expect(constructEmailString(data)).toBe('mailto:?subject=Test&body=Body');
    });

    it('should handle completely empty data', () => {
      const data: EmailData = {
        email: '',
        subject: '',
        body: ''
      };
      expect(constructEmailString(data)).toBe('mailto:?subject=&body=');
    });
  });

  describe('constructVCardString', () => {
    it('should handle fields consisting only of delimiters', () => {
      const data: VCardData = {
        firstName: ';;;',
        lastName: '\\',
        organization: ',',
        title: '',
        phone: '',
        email: '',
        website: '',
        street: '',
        city: '',
        country: ''
      };
      const result = constructVCardString(data);
      // N:lastName;firstName;;;
      // lastName = '\\' -> '\\\\'
      // firstName = ';;;' -> '\;\;' (wait, backslash first?)
      // delimiters are ; and , and \

      // Expected behavior:
      // lastName: \ -> escaped to \\
      // firstName: ;;; -> escaped to \;\; (Wait, if I have ';;;', it becomes '\;\;\\;')

      expect(result).toContain('N:\\\\;\\;\\;\\;');
      expect(result).toContain('ORG:\\,');
    });
  });

  describe('constructPaymentString', () => {
    it('should handle parameter injection attempts in amount', () => {
      const data: PaymentData = {
        network: 'bitcoin',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '0.1&label=Hacked',
        label: 'Donation'
      };
      const result = constructPaymentString(data);
      // Should encode the ampersand
      expect(result).toContain('amount=0.1%26label%3DHacked');
    });
  });
});
