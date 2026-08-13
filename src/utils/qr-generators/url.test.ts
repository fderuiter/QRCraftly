import { describe, it, expect } from 'vitest';
import { UrlContract, constructUrlString } from './url';
import { QRType } from '../../types';

describe('Url generator and contract', () => {
  it('constructs url string with normalization', () => {
    expect(constructUrlString({ url: 'https://example.com' })).toBe('https://example.com/');
    expect(constructUrlString({ url: 'google.com' })).toBe('http://google.com/');
  });

  it('implements UrlContract correctly and validates URLs', () => {
    expect(UrlContract.type).toBe(QRType.URL);
    expect(UrlContract.matches('https://example.com')).toBe(true);
    expect(UrlContract.matches('random')).toBe(false);

    // Empty URL hydration
    expect(UrlContract.hydrate('https://example.com')).toEqual({ url: 'https://example.com' });

    // Safe URL validation
    expect(UrlContract.validate?.('https://example.com')).toEqual([]);

    // Dangerous URL validation
    expect(UrlContract.validate?.('javascript:alert(1)')).toEqual(['URI_INJECTION_VIOLATION']);

    // Malformed URL starting with http
    expect(UrlContract.validate?.('http://invalid url space')).toEqual(['URL_STRUCTURE_VIOLATION']);
  });
});
