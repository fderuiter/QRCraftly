import { describe, it, expect } from 'vitest';
import { constructSmsString, SmsData } from './sms';

describe('SMS Formatter', () => {
  describe('constructSmsString', () => {
    it('constructs an sms URI with number and encoded body', () => {
      const data: SmsData = {
        number: '+1 (555) 999-8888',
        message: 'Hello there'
      };
      expect(constructSmsString(data)).toBe('sms:+1(555)999-8888?body=Hello%20there');
    });

    it('correctly encodes special characters in message body', () => {
      const data: SmsData = {
        number: '123',
        message: 'Hello & Welcome? 100%'
      };
      // & -> %26, ? -> %3F, % -> %25
      expect(constructSmsString(data)).toBe('sms:123?body=Hello%20%26%20Welcome%3F%20100%25');
    });
  });
});
