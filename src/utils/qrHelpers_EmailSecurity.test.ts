import { describe, it, expect } from 'vitest';
import { constructEmailString } from './qrHelpers';
import { EmailData } from '../types';

describe('QR Helpers Email Security', () => {
  it('constructEmailString should strip newlines from email to prevent header injection', () => {
    const data: EmailData = {
      email: 'user@example.com\ncc:attacker@example.com',
      subject: 'Test',
      body: 'Body'
    };
    const result = constructEmailString(data);
    // The result should not contain \n or %0A (if encoded, but currently not encoded)
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
    // If it's correctly stripped: mailto:user@example.comcc:attacker@example.com?subject=Test&body=Body
    expect(result).toBe('mailto:user@example.comcc:attacker@example.com?subject=Test&body=Body');
  });

  it('constructEmailString should strip control characters from email', () => {
      const data: EmailData = {
          email: 'user@example.com\x00',
          subject: 'Test',
          body: 'Body'
      };
      const result = constructEmailString(data);
      expect(result).not.toContain('\x00');
      expect(result).toBe('mailto:user@example.com?subject=Test&body=Body');
  });
});
