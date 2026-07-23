import { describe, it, expect } from 'vitest';
import { constructPaymentString, hydratePaymentData } from './payment';
import { CryptoNetwork } from '../../types';

describe('Payment generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      network: CryptoNetwork.BITCOIN,
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '1.5',
      label: 'Donation'
    };
    const str = constructPaymentString(data);
    const hydrated = hydratePaymentData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates without amount or label', () => {
    const data = {
      network: CryptoNetwork.BITCOIN,
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '',
      label: ''
    };
    const str = constructPaymentString(data);
    const hydrated = hydratePaymentData(str);
    expect(hydrated).toEqual(data);
  });

  it('handles unknown network', () => {
    const result = hydratePaymentData('unknown:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.network).toBe(CryptoNetwork.CUSTOM);
  });

  it('handles no colon', () => {
    const result = hydratePaymentData('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result.network).toBe(CryptoNetwork.CUSTOM);
    expect(result.address).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });

  it('returns default state for http urls', () => {
    const expected = {
      network: CryptoNetwork.BITCOIN,
      address: '',
      amount: '',
      label: ''
    };
    expect(hydratePaymentData('https://example.com')).toEqual(expected);
    expect(hydratePaymentData('http://example.com')).toEqual(expected);
  });

  it('handles query parameters without amount or label', () => {
    const result = hydratePaymentData('bitcoin:1A1z?other=123');
    expect(result.amount).toBe('');
    expect(result.label).toBe('');
  });
});
