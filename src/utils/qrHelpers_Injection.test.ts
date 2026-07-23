
import { describe, it, expect } from 'vitest';
import { constructWifiString } from './qr-generators/wifi';
import { constructPaymentString } from './qr-generators/payment';
import { WifiEncryption, WifiData, PaymentData } from '../types';

describe('QR Helper Injection', () => {
  describe('WiFi String Injection', () => {
    it('should inject fields if hidden is not a boolean', () => {
      const maliciousData = {
        ssid: 'MyNetwork',
        password: 'pass',
        encryption: WifiEncryption.WPA,
        // @ts-ignore - simulating runtime type mismatch or injection
        hidden: 'true;S:EvilSSID'
      } as unknown as WifiData;

      const result = constructWifiString(maliciousData);
      console.log('Result:', result);
      expect(result).not.toContain('S:EvilSSID');
    });

    it('should inject fields if encryption contains delimiters', () => {
      const maliciousData = {
        ssid: 'MyNetwork',
        password: 'pass',
        // @ts-ignore
        encryption: 'WPA;S:EvilSSID',
        hidden: false
      } as unknown as WifiData;

      const result = constructWifiString(maliciousData);
      console.log('Result:', result);
      expect(result).not.toContain('S:EvilSSID');
    });
  });

  describe('Payment String Injection', () => {
    it('should not allow javascript protocol in network field', () => {
      const maliciousData = {
        // @ts-ignore
        network: 'javascript',
        address: 'alert(1)',
        amount: '',
        label: ''
      } as unknown as PaymentData;

      const result = constructPaymentString(maliciousData);
      console.log('Payment Result:', result);
      expect(result).not.toContain('javascript:alert(1)');
      // Ideally it should fall back to empty or safe string
      expect(result).toBe('');
    });
  });
});
