import { describe, it, expect } from 'vitest';
import { constructEmailString, hydrateEmailData, EmailContract } from './email';
import { QRType } from '../../types';

describe('Email generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      email: 'test@example.com',
      subject: 'Hello World',
      body: 'How are you?'
    };
    const str = constructEmailString(data);
    const hydrated = hydrateEmailData(str);
    expect(hydrated).toEqual(data);
  });

  it('hydrates MATMSG format', () => {
    const hydrated = hydrateEmailData('MATMSG:TO:test@example.com;SUB:Hello World;BODY:How are you?;;');
    expect(hydrated).toEqual({
      email: 'test@example.com',
      subject: 'Hello World',
      body: 'How are you?'
    });
  });

  it('hydrates MATMSG format with escaped semicolons and lookahead recombination', () => {
    const hydrated = hydrateEmailData('MATMSG:TO:test@example.com;SUB:Subject with \\; escaped semicolon;BODY:Hello; World; This is a trailing \\; escaped;');
    expect(hydrated).toEqual({
      email: 'test@example.com',
      subject: 'Subject with ; escaped semicolon',
      body: 'Hello; World; This is a trailing ; escaped'
    });
  });

  it('hydrates MATMSG format with invalid part', () => {
    const hydrated = hydrateEmailData('MATMSG:INVALID;;');
    expect(hydrated).toEqual({
      email: '',
      subject: '',
      body: ''
    });
  });

  it('returns default for unknown format or invalid url', () => {
    expect(hydrateEmailData('random')).toEqual({ email: '', subject: '', body: '' });
    expect(hydrateEmailData('mailto:http://%%invalid')).toEqual({ email: 'http://%%invalid', subject: '', body: '' });
  });

  it('returns default for non-email schemes', () => {
    expect(hydrateEmailData('tel:1234567890')).toEqual({ email: '', subject: '', body: '' });
  });

  it('implements EmailContract correctly and validates emails', () => {
    expect(EmailContract.type).toBe(QRType.EMAIL);
    expect(EmailContract.matches('mailto:test@example.com')).toBe(true);
    expect(EmailContract.matches('tel:12345')).toBe(false);

    // Valid mailto starting
    expect(EmailContract.validate?.('mailto:test@example.com')).toEqual([]);
    
    // Invalid mailto starting
    expect(EmailContract.validate?.('mailto:invalid_email')).toEqual(['EMAIL_STRUCTURE_VIOLATION']);

    // Non-mailto starting
    expect(EmailContract.validate?.('invalid_email')).toEqual(['EMAIL_STRUCTURE_VIOLATION']);
  });
});
