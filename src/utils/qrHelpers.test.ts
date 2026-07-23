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

import { FIXTURES } from '../../tests/fixtures/data';
import { describe, it, expect } from 'vitest';
import { constructWifiString } from './qr-generators/wifi';
import { constructEmailString } from './qr-generators/email';
import { constructVCardString } from './qr-generators/vcard';
import { constructPhoneString } from './qr-generators/phone';
import { constructSmsString } from './qr-generators/sms';
import { constructPaymentString } from './qr-generators/payment';
import { constructEventString } from './qr-generators/event';
import { WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData, EventData, WifiEncryption, CryptoNetwork } from '../types';

describe('QR Helpers', () => {
  describe('constructWifiString', () => {
    it('constructs a standard WPA WiFi string', () => {
      const data: WifiData = {
        ssid: 'MyNetwork',
        password: 'password123',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:MyNetwork;P:password123;;');
    });

    it('constructs a WPA2-EAP WiFi string', () => {
      const data: WifiData = {
        ssid: 'EnterpriseNet',
        password: 'securepass',
        encryption: WifiEncryption.WPA2_EAP,
        hidden: false,
        eapIdentity: 'user@domain.com'
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA2-EAP;S:EnterpriseNet;I:user@domain.com;P:securepass;;');
    });

    it('constructs a nopass WiFi string (omits password)', () => {
      const data: WifiData = {
        ssid: 'OpenNet',
        password: 'ignored',
        encryption: WifiEncryption.NOPASS,
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:nopass;S:OpenNet;;');
    });

    it('escapes special characters in SSID and password', () => {
      const data: WifiData = {
        ssid: 'Net;Work',
        password: 'pass:word\\',
        encryption: WifiEncryption.WPA,
        hidden: false
      };
      // Expect: Net\;Work and pass\:word\\
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:Net\\;Work;P:pass\\:word\\\\;;');
    });

    it('handles hidden network flag', () => {
      const data: WifiData = {
        ssid: 'HiddenNet',
        password: 'pass',
        encryption: WifiEncryption.WPA,
        hidden: true
      };
      expect(constructWifiString(data)).toContain('H:true');
    });
  });

  describe('constructEmailString', () => {
    it('constructs a valid mailto string with encoding', () => {
      const data: EmailData = {
        email: 'test@example.com',
        subject: 'Hello World',
        body: 'This is a test message.'
      };
      const result = constructEmailString(data);
      expect(result).toBe('mailto:test@example.com?subject=Hello%20World&body=This%20is%20a%20test%20message.');
    });

    it('handles special characters in subject and body', () => {
      const data: EmailData = {
        email: 'foo@bar.com',
        subject: 'Q&A',
        body: '100% correct?'
      };
      const result = constructEmailString(data);
      expect(result).toContain('subject=Q%26A');
      expect(result).toContain('body=100%25%20correct%3F');
    });

    it('sanitizes email to prevent header injection', () => {
      const data: EmailData = {
        email: 'user@example.com?cc=attacker@example.com',
        subject: 'Test',
        body: 'Body'
      };
      const result = constructEmailString(data);
      // Should strip anything after the ?
      expect(result).toBe('mailto:user@example.com?subject=Test&body=Body');
    });
  });

  describe('constructVCardString', () => {
    const baseVCard: VCardData = FIXTURES.vCard.baseData;

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
      expect(result).toContain('ADR:;;123 Main St;Metropolis;;12345;USA');
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
      expect(result).toContain('ADR:;;123 Main St\\; Apt 4;Metropolis;;12345;USA');
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

  describe('constructPhoneString', () => {
    it('constructs a tel URI and strips whitespace', () => {
      const data: PhoneData = { number: '+1 (555) 123-4567' };
      expect(constructPhoneString(data)).toBe('tel:+1(555)123-4567');
    });

    it('strips colons from phone number', () => {
        const data: PhoneData = { number: '+1:234:567' };
        expect(constructPhoneString(data)).toBe('tel:+1234567');
    });
  });

  describe('constructSmsString', () => {
    it('constructs an sms URI with number and encoded body', () => {
      const data: SmsData = {
        number: '+1 (555) 999-8888',
        message: 'Hello there'
      };
      expect(constructSmsString(data)).toBe('sms:+1(555)999-8888?body=Hello%20there');
    });

    it('correctly encodes special characters in message body', () => {
      const data: SmsData = {
        number: '123',
        message: 'Hello & Welcome? 100%'
      };
      // & -> %26, ? -> %3F, % -> %25
      expect(constructSmsString(data)).toBe('sms:123?body=Hello%20%26%20Welcome%3F%20100%25');
    });
  });

  describe('constructPaymentString', () => {
    it('constructs a basic crypto URI', () => {
      const data: PaymentData = {
        network: CryptoNetwork.BITCOIN,
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '',
        label: ''
      };
      expect(constructPaymentString(data)).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    });

    it('constructs a crypto URI with amount and label', () => {
      const data: PaymentData = {
        network: CryptoNetwork.ETHEREUM,
        address: '0x123...',
        amount: '1.5',
        label: 'Payment for Services'
      };
      const result = constructPaymentString(data);
      expect(result).toContain('ethereum:0x123...');
      expect(result).toContain('amount=1.5');
      expect(result).toContain('label=Payment%20for%20Services');
    });

    it('sanitizes address input to prevent parameter injection', () => {
      const data: PaymentData = {
        network: CryptoNetwork.BITCOIN,
        address: '1A1...?amount=1000',
        amount: '0.1',
        label: ''
      };
      // Should strip the ?amount=1000 from the address part
      const result = constructPaymentString(data);
      expect(result).toContain('bitcoin:1A1...');
      expect(result).not.toContain('bitcoin:1A1...?amount=1000');
    });

    it('encodes amount to prevent injection', () => {
        const data: PaymentData = {
            network: CryptoNetwork.BITCOIN,
            address: '1A1...',
            amount: '1&label=hacked',
            label: ''
        };
        const result = constructPaymentString(data);
        expect(result).toContain('amount=1%26label%3Dhacked');
        expect(result).not.toContain('&label=hacked'); // Should not be interpreted as a raw param
    });

    it('returns raw address for custom network', () => {
         const data: PaymentData = {
            network: CryptoNetwork.CUSTOM,
            address: 'myprotocol://addr',
            amount: '10', // Should be ignored or handled by the user in the address field
            label: 'label'
        };
        // For custom, it just returns the address field as is
        expect(constructPaymentString(data)).toBe('myprotocol://addr');
    });

    it('returns empty string for dangerous custom network address', () => {
      const data: PaymentData = {
        network: CryptoNetwork.CUSTOM,
        address: 'javascript:alert(1)',
        amount: '10',
        label: 'label'
      };
      expect(constructPaymentString(data)).toBe('');
    });
  });

  describe('constructEventString', () => {
    const baseEvent: EventData = {
      title: 'Team Meeting',
      startDate: '2026-05-01T09:00',
      endDate: '2026-05-01T10:00',
      location: 'HQ Boardroom',
      description: 'Quarterly planning sync'
    };

    it('constructs a valid VCALENDAR string', () => {
      const result = constructEventString(baseEvent);
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('SUMMARY:Team Meeting');
      expect(result).toContain('DTSTART:20260501T090000');
      expect(result).toContain('DTEND:20260501T100000');
      expect(result).toContain('LOCATION:HQ Boardroom');
      expect(result).toContain('DESCRIPTION:Quarterly planning sync');
      expect(result).toContain('END:VEVENT');
      expect(result).toContain('END:VCALENDAR');
    });

    it('escapes special characters in event fields', () => {
      const result = constructEventString({
        ...baseEvent,
        title: 'Launch, Party; 2026',
        location: 'Office\\Roof',
        description: 'Line 1\nLine 2, details;'
      });

      expect(result).toContain('SUMMARY:Launch\\, Party\\; 2026');
      expect(result).toContain('LOCATION:Office\\\\Roof');
      expect(result).toContain('DESCRIPTION:Line 1\\nLine 2\\, details\\;');
    });
  });
});
