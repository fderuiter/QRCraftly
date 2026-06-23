import { describe, it, expect } from 'vitest';
import { constructEmailString, hydrateEmailData } from './email';

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
});
