/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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
import { constructPaymentString, hydratePaymentData, PaymentContract } from '../index';
import { CryptoNetwork, QRType } from '@/types';

describe('Payment generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      network: CryptoNetwork.BITCOIN,
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '1.5',
      label: 'Donation',
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
      label: '',
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
      label: '',
    };
    expect(hydratePaymentData('https://example.com')).toEqual(expected);
    expect(hydratePaymentData('http://example.com')).toEqual(expected);
  });

  it('handles query parameters without amount or label', () => {
    const result = hydratePaymentData('bitcoin:1A1z?other=123');
    expect(result.amount).toBe('');
    expect(result.label).toBe('');
  });

  it('implements PaymentContract correctly and validates raw strings', () => {
    expect(PaymentContract.type).toBe(QRType.PAYMENT);
    expect(PaymentContract.matches('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
    expect(PaymentContract.matches('random')).toBe(false);

    // Empty validation
    expect(PaymentContract.validate?.('')).toEqual([]);

    // Safe validation
    expect(PaymentContract.validate?.('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toEqual([]);

    // Dangerous validation
    expect(PaymentContract.validate?.('javascript:alert(1)')).toEqual(['URI_INJECTION_VIOLATION']);
  });
});
