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
  constructSmsString,
  constructWifiString,
  constructVCardString
} from './qrHelpers';
import { EmailData, SmsData, WifiData, WifiEncryption, VCardData } from '../types';

describe('QR Helper Edge Cases', () => {
  describe('Email QR Construction', () => {
    it('should support multiple recipients separated by comma', () => {
      const data: EmailData = {
        email: 'user1@example.com,user2@example.com',
        subject: 'Meeting',
        body: 'Reminder'
      };
      // Comma is a valid character in email address lists and should not be stripped or escaped by sanitizeInput
      const result = constructEmailString(data);
      expect(result).toBe('mailto:user1@example.com,user2@example.com?subject=Meeting&body=Reminder');
    });

    it('should correctly encode newlines in email body', () => {
      const data: EmailData = {
        email: 'test@example.com',
        subject: 'Greetings',
        body: 'Hello\nWorld\r\nTest'
      };
      const result = constructEmailString(data);
      // \n -> %0A, \r -> %0D
      // encodeURIComponent encodes \n as %0A
      expect(result).toContain('body=Hello%0AWorld%0D%0ATest');
    });
  });

  describe('SMS QR Construction', () => {
    it('should preserve international format (+) and valid separators', () => {
      const data: SmsData = {
        number: '+1 (555) 123-4567',
        message: 'Hello'
      };
      // cleanPhoneNumber allows + ( ) - .
      const result = constructSmsString(data);
      expect(result).toBe('sms:+1(555)123-4567?body=Hello');
    });

    it('should strip invalid characters from phone number', () => {
      const data: SmsData = {
        number: '123-ABC-456',
        message: 'Hello'
      };
      // ABC should be removed
      const result = constructSmsString(data);
      expect(result).toBe('sms:123--456?body=Hello');
    });
  });

  describe('WiFi QR Construction', () => {
    it('should escape double quotes in SSID', () => {
      const data: WifiData = {
        ssid: 'My "Test" Net',
        password: 'pass',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      // " should become \"
      const result = constructWifiString(data);
      expect(result).toContain('S:My \\"Test\\" Net');
    });

    it('should escape backslashes in SSID', () => {
      const data: WifiData = {
        ssid: 'Domain\\User',
        password: 'pass',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      // \ should become \\
      const result = constructWifiString(data);
      expect(result).toContain('S:Domain\\\\User');
    });
  });

  describe('VCard QR Construction', () => {
    const baseVCard: VCardData = {
      firstName: 'John',
      lastName: 'Doe',
      organization: 'Acme',
      title: 'Dev',
      phone: '123',
      email: 'john@example.com',
      website: '',
      street: '',
      city: '',
      country: ''
    };

    it('should escape commas in URLs', () => {
      const data = { ...baseVCard, website: 'http://example.com/foo,bar' };
      const result = constructVCardString(data);
      // VCard requires escaping commas in property values
      expect(result).toContain('URL:http://example.com/foo\\,bar');
    });

    it('should handle complex organization names with delimiters', () => {
      const data = { ...baseVCard, organization: 'Acme; Inc., & Co.' };
      const result = constructVCardString(data);
      // ; -> \;
      // , -> \,
      expect(result).toContain('ORG:Acme\\; Inc.\\, & Co.');
    });

    it('should handle very long fields robustly', () => {
      const longString = 'A'.repeat(1000);
      const data = { ...baseVCard, title: longString };
      const result = constructVCardString(data);
      expect(result).toContain(`TITLE:${longString}`);
    });
  });
});
