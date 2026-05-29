import { describe, it, expect } from 'vitest';
import { constructPhoneString, hydratePhoneData } from './phone';

describe('Phone generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      number: '+1234567890',
    };
    const str = constructPhoneString(data);
    const hydrated = hydratePhoneData(str);
    expect(hydrated).toEqual(data);
  });
});
