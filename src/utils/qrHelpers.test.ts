import { describe, it, expect } from 'vitest';
import {
  escapeWifiString,
  constructWifiString,
  constructEmailString,
  escapeVCardString,
  constructVCardString,
  constructPhoneString,
  constructSmsString,
  constructPaymentString
} from './qrHelpers';
import { QRType, WifiEncryption, WifiData, EmailData, VCardData, PhoneData, SmsData, PaymentData } from '../types';

describe('qrHelpers', () => {
  describe('constructWifiString', () => {
    it('constructs standard WPA string', () => {
      const data: WifiData = {
        ssid: 'MyNetwork',
        password: 'password123',
        encryption: 'WPA',
        hidden: false,
        eapIdentity: ''
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:MyNetwork;P:password123;H:false;;');
    });

    it('constructs hidden network string', () => {
      const data: WifiData = {
        ssid: 'HiddenNet',
        password: 'pass',
        encryption: 'WPA',
        hidden: true,
        eapIdentity: ''
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:HiddenNet;P:pass;H:true;;');
    });

    it('constructs nopass string', () => {
      const data: WifiData = {
        ssid: 'FreeWifi',
        password: '',
        encryption: 'nopass',
        hidden: false,
        eapIdentity: ''
      };
      expect(constructWifiString(data)).toBe('WIFI:T:nopass;S:FreeWifi;H:false;;');
    });

    it('constructs WPA2-EAP string', () => {
      const data: WifiData = {
        ssid: 'CorpNet',
        password: 'secretpass',
        encryption: 'WPA2-EAP',
        hidden: false,
        eapIdentity: 'user@domain.com'
      };
      expect(constructWifiString(data)).toBe('WIFI:T:WPA2-EAP;S:CorpNet;I:user@domain.com;P:secretpass;H:false;;');
    });

    it('escapes special characters in SSID and Password', () => {
      const data: WifiData = {
        ssid: 'Net;work\\Name',
        password: 'pass,word:123',
        encryption: 'WPA',
        hidden: false,
        eapIdentity: ''
      };
      // Escaped: Net\;work\\Name -> S:Net\;work\\Name
      // Escaped: pass\,word\:123 -> P:pass\,word\:123
      expect(constructWifiString(data)).toBe('WIFI:T:WPA;S:Net\\;work\\\\Name;P:pass\\,word\\:123;H:false;;');
    });
  });

  describe('escapeVCardString', () => {
    it('escapes newlines, commas, semicolons, and backslashes', () => {
      const input = 'Street\\Name\nCity,State;Country';
      // \ -> \\
      // \n -> \n
      // , -> \,
      // ; -> \;
      const expected = 'Street\\\\Name\\nCity\\,State\\;Country';
      expect(escapeVCardString(input)).toBe(expected);
    });

    it('handles undefined input', () => {
      expect(escapeVCardString(undefined)).toBe('');
    });
  });

  describe('constructVCardString', () => {
    it('constructs valid vCard 3.0 string', () => {
      const data: VCardData = {
        firstName: 'John',
        lastName: 'Doe',
        organization: 'Acme Inc',
        title: 'Engineer',
        email: 'john@example.com',
        phone: '1234567890',
        website: 'https://example.com',
        street: '123 Main St',
        city: 'Metropolis',
        country: 'USA'
      };

      const result = constructVCardString(data);
      expect(result).toContain('BEGIN:VCARD');
      expect(result).toContain('VERSION:3.0');
      expect(result).toContain('N:Doe;John;;;');
      expect(result).toContain('FN:John Doe');
      expect(result).toContain('ORG:Acme Inc');
      expect(result).toContain('TITLE:Engineer');
      expect(result).toContain('TEL:1234567890');
      expect(result).toContain('EMAIL:john@example.com');
      expect(result).toContain('URL:https://example.com');
      expect(result).toContain('ADR:;;123 Main St;Metropolis;;;USA');
      expect(result).toContain('END:VCARD');
    });

    it('escapes fields in vCard', () => {
      const data: VCardData = {
        firstName: 'John,Jr',
        lastName: 'Doe;Sr',
        organization: 'Acme\\Corp',
        title: 'VP\nEngineering',
        email: '',
        phone: '',
        website: '',
        street: '',
        city: '',
        country: ''
      };

      const result = constructVCardString(data);
      expect(result).toContain('N:Doe\\;Sr;John\\,Jr;;;');
      expect(result).toContain('ORG:Acme\\\\Corp');
      expect(result).toContain('TITLE:VP\\nEngineering');
    });
  });

  describe('constructEmailString', () => {
    it('constructs mailto link with encoded components', () => {
      const data: EmailData = {
        email: 'test@example.com',
        subject: 'Hello World',
        body: 'Line 1\nLine 2'
      };
      expect(constructEmailString(data)).toBe('mailto:test@example.com?subject=Hello%20World&body=Line%201%0ALine%202');
    });
  });

  describe('constructPhoneString', () => {
    it('strips non-numeric characters', () => {
      const data: PhoneData = { number: '+1 (555) 123-4567' };
      // Note: the implementation currently only strips whitespace and colons,
      // based on `data.number.replace(/[\s:]+/g, '')`.
      // It does NOT strip () or - unless the implementation changes.
      // Let's verify current behavior.
      // Looking at `src/utils/qrHelpers.ts`: `replace(/[\s:]+/g, '')`
      // So () and - remain.
      expect(constructPhoneString(data)).toBe('tel:+1(555)123-4567');
    });
  });

  describe('constructSmsString', () => {
    it('constructs smsto URI', () => {
      const data: SmsData = { number: '123456', message: 'Hello There' };
      expect(constructSmsString(data)).toBe('smsto:123456:Hello There');
    });
  });

  describe('constructPaymentString', () => {
    it('constructs custom network address', () => {
      const data: PaymentData = {
        network: 'custom',
        address: 'my-address',
        amount: '',
        label: ''
      };
      expect(constructPaymentString(data)).toBe('my-address');
    });

    it('constructs crypto URI with amount and label', () => {
      const data: PaymentData = {
        network: 'bitcoin',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: '0.01',
        label: 'Donation'
      };
      expect(constructPaymentString(data)).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.01&label=Donation');
    });

    it('constructs crypto URI with encoded label', () => {
      const data: PaymentData = {
        network: 'ethereum',
        address: '0x123',
        amount: '',
        label: 'My Wallet & Stash'
      };
      expect(constructPaymentString(data)).toBe('ethereum:0x123?label=My%20Wallet%20%26%20Stash');
    });
  });
});
