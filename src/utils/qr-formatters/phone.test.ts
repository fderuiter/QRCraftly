import { describe, it, expect } from 'vitest';
import { constructPhoneString, PhoneData } from './phone';

describe('Phone Formatter', () => {
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
});
