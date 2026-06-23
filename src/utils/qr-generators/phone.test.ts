import { describe, it, expect } from 'vitest';
import { constructPhoneString, hydratePhoneData } from './phone';

describe('Phone generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      number: '+1234567890'
    };
    const str = constructPhoneString(data);
    const hydrated = hydratePhoneData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates empty object when given non-tel string', () => {
    const hydrated = hydratePhoneData('mailto:test@test.com');
    expect(hydrated).toEqual({ number: '' });
  });

  it('hydrates empty object when given invalid string', () => {
    const hydrated = hydratePhoneData('invalid-string');
    expect(hydrated).toEqual({ number: '' });
  });
});
