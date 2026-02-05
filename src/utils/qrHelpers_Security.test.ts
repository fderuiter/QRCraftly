import { describe, it, expect } from 'vitest';
import { constructPaymentString } from './qrHelpers';
import { CryptoNetwork } from '../types';

describe('qrHelpers Security', () => {
  describe('constructPaymentString', () => {
    it('blocks dangerous schemes in custom network', () => {
      const dangerousPayload = 'javascript:alert(1)';
      const result = constructPaymentString({
        network: CryptoNetwork.CUSTOM,
        address: dangerousPayload,
        amount: '',
        label: ''
      });
      expect(result).toBe('');
    });

    it('allows valid custom URIs', () => {
      const validPayload = 'bitcoin:123?amount=10';
      const result = constructPaymentString({
        network: CryptoNetwork.CUSTOM,
        address: validPayload,
        amount: '',
        label: ''
      });
      expect(result).toBe(validPayload);
    });

    it('constructPaymentString allows parameter injection in custom network if protocol is safe', () => {
      // This is expected behavior for "custom" network - user controls the full string
      // but we ensure it doesn't start with javascript:
      const payload = 'bitcoin:123?amount=100&label=Hack';
      const result = constructPaymentString({
        network: CryptoNetwork.CUSTOM,
        address: payload,
        amount: '',
        label: ''
      });
      expect(result).toBe(payload);
    });
  });
});
