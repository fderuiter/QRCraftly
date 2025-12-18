import { describe, it, expect } from 'vitest';
import {
  constructWifiString,
  constructEmailString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString,
  escapeWifiString,
  escapeVCardString
} from './qrHelpers';
import { WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../types';

describe('QR Helpers', () => {
  describe('constructWifiString', () => {
    it('constructs a standard WPA WiFi string', () => {
      const data: WifiData = {
        ssid: 'MyNetwork',
        password: 'password123',
        encryption: 'WPA',
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:MyNetwork;P:password123;H:false;;');
    });

    it('constructs a WPA2-EAP WiFi string', () => {
      const data: WifiData = {
        ssid: 'EnterpriseNet',
        password: 'securepass',
        encryption: 'WPA2-EAP',
        hidden: false,
        eapIdentity: 'user@domain.com'
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA2-EAP;S:EnterpriseNet;I:user@domain.com;P:securepass;H:false;;');
    });

    it('constructs a nopass WiFi string (omits password)', () => {
      const data: WifiData = {
        ssid: 'OpenNet',
        password: 'ignored',
        encryption: 'nopass',
        hidden: false
      };
      expect(constructWifiString(data)).toBe('WIFI:T:nopass;S:OpenNet;H:false;;');
    });

    it('escapes special characters in SSID and password', () => {
      const data: WifiData = {
        ssid: 'Net;Work',
        password: 'pass:word\\',
        encryption: 'WPA',
        hidden: false
      };
      // Expect: Net\;Work and pass\:word\\
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:Net\\;Work;P:pass\\:word\\\\;H:false;;');
    });

    it('handles hidden network flag', () => {
      const data: WifiData = {
        ssid: 'HiddenNet',
        password: 'pass',
        encryption: 'WPA',
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
  });

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
    it('constructs an smsto URI with number and message', () => {
      const data: SmsData = {
        number: '+1 (555) 999-8888',
        message: 'Hello there'
      };
      // Note: The current implementation does NOT encode the message body in the URI structure for smsto:Number:Message
      // It returns `smsto:${cleanNumber}:${data.message}`
      expect(constructSmsString(data)).toBe('smsto:+1(555)999-8888:Hello there');
    });
  });

  describe('constructPaymentString', () => {
    it('constructs a basic crypto URI', () => {
      const data: PaymentData = {
        network: 'bitcoin',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '',
        label: ''
      };
      expect(constructPaymentString(data)).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    });

    it('constructs a crypto URI with amount and label', () => {
      const data: PaymentData = {
        network: 'ethereum',
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
        network: 'bitcoin',
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
            network: 'bitcoin',
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
            network: 'custom',
            address: 'myprotocol://addr',
            amount: '10', // Should be ignored or handled by the user in the address field
            label: 'label'
        };
        // For custom, it just returns the address field as is
        expect(constructPaymentString(data)).toBe('myprotocol://addr');
    });
  });

  describe('escapeWifiString', () => {
    it('returns empty string for undefined', () => {
      expect(escapeWifiString(undefined)).toBe('');
    });
  });

  describe('escapeVCardString', () => {
    it('returns empty string for undefined', () => {
      expect(escapeVCardString(undefined)).toBe('');
    });
  });
});
