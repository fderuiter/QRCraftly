import { describe, it, expect } from 'vitest';
import { constructSmsString, hydrateSmsData } from './sms';

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
});
