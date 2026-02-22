import { describe, it, expect } from 'vitest';
import { constructPaymentString, PaymentData, CryptoNetwork } from './payment';

describe('Payment Formatter', () => {
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
});
