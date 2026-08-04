import { describe, it, expect } from 'vitest';
import { SmsContract, constructSmsString, hydrateSmsData } from './sms';
import { constructPhoneString } from './phone';

describe('Sms generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      number: '+1234567890',
      message: 'Hello, this is a test!'
    };
    const str = constructSmsString(data);
    const hydrated = hydrateSmsData(str);
    expect(hydrated).toEqual(data);
  });

  it('constructs and hydrates without message', () => {
    const data = {
      number: '+1234567890',
      message: ''
    };
    const str = constructSmsString(data);
    const hydrated = hydrateSmsData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates older smsto format with body', () => {
    const hydrated = hydrateSmsData('smsto:+1234567890:Hello');
    expect(hydrated).toEqual({ number: '+1234567890', message: 'Hello' });
  });

  it('hydrates older smsto format without body', () => {
    const hydrated = hydrateSmsData('smsto:+1234567890');
    expect(hydrated).toEqual({ number: '+1234567890', message: '' });
  });

  it('returns default for unknown', () => {
    expect(hydrateSmsData('random')).toEqual({ number: '', message: '' });
  });

  describe('Isolated SMS Multi-Recipient Support (Requirement 1 & 3)', () => {
    it('accepts semicolon-separated numbers and preserves semicolons', () => {
      const data = {
        number: '+15550000000;+15551111111;+15552222222',
        message: 'Alert Broadcast'
      };
      const str = constructSmsString(data);
      expect(str).toBe('sms:+15550000000;+15551111111;+15552222222?body=Alert%20Broadcast');
      const hydrated = hydrateSmsData(str);
      expect(hydrated).toEqual(data);
    });

    it('accepts comma-separated numbers and preserves commas', () => {
      const data = {
        number: '+15550000000,+15551111111',
        message: 'Routing test'
      };
      const str = constructSmsString(data);
      expect(str).toBe('sms:+15550000000,+15551111111?body=Routing%20test');
      const hydrated = hydrateSmsData(str);
      expect(hydrated).toEqual(data);
    });
  });

  describe('Global validation logic comparison (Requirement 2)', () => {
    it('standard telephone generator strips semicolons and commas by default', () => {
      const phoneData = {
        number: '+15550000000;+15551111111,123'
      };
      const str = constructPhoneString(phoneData);
      // Semicolons and commas are stripped, only whitelisted phone symbols remain
      expect(str).toBe('tel:+15550000000+15551111111123');
    });
  });

  describe('SMS Phone Number Input Validation Rules', () => {
    it('accepts numbers with whitelisted symbols, semicolons, and commas', () => {
      const validUri = 'sms:+1(555)-123-4567;+1.555.987.6543,123#*?body=hello';
      const violations = SmsContract.validate?.(validUri);
      expect(violations).toEqual([]);
    });

    it('rejects numbers containing letters', () => {
      const invalidUri = 'sms:+15550000000;+1555abc1111?body=hello';
      const violations = SmsContract.validate?.(invalidUri);
      expect(violations).toContain('SMS_PHONE_STRUCTURE_VIOLATION');
    });

    it('rejects numbers containing non-whitelisted symbols', () => {
      const invalidUri = 'sms:+15550000000%+15551111111?body=hello';
      const violations = SmsContract.validate?.(invalidUri);
      expect(violations).toContain('SMS_PHONE_STRUCTURE_VIOLATION');
    });

    it('rejects numbers containing line-break control characters', () => {
      const invalidUri = 'sms:+15550000000;\n+15551111111?body=hello';
      const violations = SmsContract.validate?.(invalidUri);
      expect(violations).toContain('SMS_PHONE_STRUCTURE_VIOLATION');
    });
  });
});
