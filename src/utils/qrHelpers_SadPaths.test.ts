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
import {
  constructEmailString,
  constructVCardString,
  constructPaymentString,
  constructSmsString,
  constructPhoneString
} from './qrHelpers';
import { EmailData, VCardData, PaymentData, CryptoNetwork, SmsData, PhoneData } from '../types';

describe('QR Helpers Sad Paths', () => {
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
        zip: '',
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
        network: CryptoNetwork.BITCOIN,
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '0.1&label=Hacked',
        label: 'Donation'
      };
      const result = constructPaymentString(data);
      // Should encode the ampersand
      expect(result).toContain('amount=0.1%26label%3DHacked');
    });
  });

  describe('constructSmsString', () => {
    it('should prevent parameter injection in SMS number', () => {
      const data: SmsData = {
        number: '123?body=injected',
        message: 'hello'
      };
      // If we don't sanitize the number, we get sms:123?body=injected?body=hello
      // We expect the number to be cleaned of URI control characters AND non-phone chars
      const result = constructSmsString(data);
      // It should NOT contain two 'body=' params or two '?'
      expect(result).not.toMatch(/\?.*\?/);
      // With strict whitelist, 'bodyinjected' is removed
      expect(result).toBe('sms:123?body=hello');
    });
  });

  describe('constructPhoneString', () => {
    it('should strip malicious parameter injections', () => {
      const data: PhoneData = {
        number: '123?body=injected'
      };
      const result = constructPhoneString(data);
      expect(result).toBe('tel:123');
    });

    it('should handle empty input', () => {
      const data: PhoneData = {
        number: ''
      };
      const result = constructPhoneString(data);
      expect(result).toBe('tel:');
    });
  });
});
