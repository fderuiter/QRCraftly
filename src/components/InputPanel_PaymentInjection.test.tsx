import { describe, it, expect } from 'vitest';
import { constructPaymentString } from '../utils/qrHelpers';

describe('Payment String Construction - Injection Risks', () => {
  it('prevents parameter injection via label in Amount field', () => {
    // Attack vector: User inputs "1&label=Hacked" into amount field
    const data = {
      network: 'bitcoin',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '1&label=Hacked',
      label: 'Official Donation'
    };

    const result = constructPaymentString(data);

    // We expect the amount to be encoded or sanitized so that & becomes %26 or rejected
    // If it's vulnerable, it will look like: bitcoin:... ?amount=1&label=Hacked&label=Official%20Donation

    expect(result).not.toContain('&label=Hacked');

    // Ideally, amount should be numeric only or encoded.
    // If we just encodeURIComponent the amount, it would be amount=1%26label%3DHacked
    // which is safe as it won't be parsed as a separate label param.
  });

  it('prevents parameter injection via query params in Address field', () => {
     // Attack vector: User inputs address "1A...?amount=100" and sets amount empty
     // Or user inputs address "1A...?label=Malicious"
     const data = {
       network: 'bitcoin',
       address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?label=Evil',
       amount: '0.5',
       label: 'Good'
     };

     const result = constructPaymentString(data);

     // Result: bitcoin:1A...?label=Evil?amount=0.5&label=Good
     // This is malformed URI (two ?), but some parsers might take the first label.

     // We should probably strip ? from address or encode it,
     // BUT valid addresses shouldn't have ? unless it's a raw URI input.
     // In 'InputPanel', we have separate fields. So we should assume address is just the address.

     expect(result).not.toContain('?label=Evil');
  });
});
