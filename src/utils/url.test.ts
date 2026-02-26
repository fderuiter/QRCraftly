import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('should return empty string for undefined input', () => {
    expect(normalizeUrl(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('should preserve valid absolute URLs (http)', () => {
    const url = 'http://example.com';
    expect(normalizeUrl(url)).toBe('http://example.com/');
  });

  it('should preserve valid absolute URLs (https)', () => {
    const url = 'https://example.com/foo';
    expect(normalizeUrl(url)).toBe('https://example.com/foo');
  });

  it('should add http:// to URLs without protocol', () => {
    const url = 'example.com';
    expect(normalizeUrl(url)).toBe('http://example.com/');
  });

  it('should add http:// to URLs starting with www', () => {
    const url = 'www.google.com';
    expect(normalizeUrl(url)).toBe('http://www.google.com/');
  });

  it('should encode spaces in URLs without protocol', () => {
    // "example.com/foo bar" -> http://example.com/foo%20bar
    const url = 'example.com/foo bar';
    expect(normalizeUrl(url)).toBe('http://example.com/foo%20bar');
  });

  it('should fallback to encodeURI for malformed URLs that cannot be parsed as URL', () => {
    // "not a url" -> "not%20a%20url" (fallback 3)
    expect(normalizeUrl('not a url')).toBe('not%20a%20url');
  });

  it('should handle complex URLs with query params containing spaces', () => {
     const url = 'https://example.com/search?q=hello world';
     expect(normalizeUrl(url)).toBe('https://example.com/search?q=hello%20world');
  });

  it('should handle URLs with existing encoded characters', () => {
      const url = 'http://example.com/foo%20bar';
      expect(normalizeUrl(url)).toBe('http://example.com/foo%20bar');
  });

  it('should return original string when all parsing/encoding fails (e.g. lone surrogates)', () => {
    // Lone surrogate \uD800 causes encodeURI to throw
    const invalid = '\uD800';
    expect(normalizeUrl(invalid)).toBe(invalid);
  });
});
