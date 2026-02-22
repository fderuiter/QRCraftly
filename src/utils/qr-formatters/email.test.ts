import { describe, it, expect } from 'vitest';
import { constructEmailString, EmailData } from './email';

describe('Email Formatter', () => {
  describe('constructEmailString', () => {
    it('constructs a valid mailto string with encoding', () => {
      const data: EmailData = {
        email: 'test@example.com',
        subject: 'Hello World',
        body: 'This is a test message.'
      };
      const result = constructEmailString(data);
      expect(result).toBe('mailto:test@example.com?subject=Hello%20World&body=This%20is%20a%20test%20message.');
    });

    it('handles special characters in subject and body', () => {
      const data: EmailData = {
        email: 'foo@bar.com',
        subject: 'Q&A',
        body: '100% correct?'
      };
      const result = constructEmailString(data);
      expect(result).toContain('subject=Q%26A');
      expect(result).toContain('body=100%25%20correct%3F');
    });

    it('sanitizes email to prevent header injection', () => {
      const data: EmailData = {
        email: 'user@example.com?cc=attacker@example.com',
        subject: 'Test',
        body: 'Body'
      };
      const result = constructEmailString(data);
      // Should strip anything after the ?
      expect(result).toBe('mailto:user@example.com?subject=Test&body=Body');
    });
  });
});
