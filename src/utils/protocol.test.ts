import { describe, it, expect, vi } from 'vitest';
import { parseProtocol } from './protocol';

describe('protocol parser', () => {
  it('returns null for falsy, empty, or whitespace-only input', () => {
    expect(parseProtocol('')).toBeNull();
    expect(parseProtocol('   ')).toBeNull();
  });

  it('parses MATMSG correctly', () => {
    const rawMatmsg = 'MATMSG:TO:test@example.com;SUB:Hello;BODY:This is a test;;';
    const parsed = parseProtocol(rawMatmsg);
    expect(parsed).not.toBeNull();
    expect(parsed!.scheme).toBe('matmsg');
    expect(parsed!.path).toBe('test@example.com');
    expect(parsed!.params.get('SUB')).toBe('Hello');
    expect(parsed!.params.get('BODY')).toBe('This is a test');
  });

  it('skips MATMSG parts with invalid colon index', () => {
    // A part without a colon or colon at start (splitIndex <= 0)
    const rawMatmsg = 'MATMSG:TO:test@example.com;:invalidpart;NOPART;BODY:Hello';
    const parsed = parseProtocol(rawMatmsg);
    expect(parsed!.path).toBe('test@example.com');
    expect(parsed!.params.get('BODY')).toBe('Hello');
  });

  it('returns null when there is no colon in input', () => {
    expect(parseProtocol('http_no_colon_slash_slash_google.com')).toBeNull();
  });

  it('parses standard smsto protocol format', () => {
    const rawSms = 'smsto:+123456789:Hello there';
    const parsed = parseProtocol(rawSms);
    expect(parsed).not.toBeNull();
    expect(parsed!.scheme).toBe('smsto');
    expect(parsed!.path).toBe('+123456789');
    expect(parsed!.params.get('body')).toBe('Hello there');
  });

  it('parses smsto protocol format without message colon', () => {
    const rawSms = 'smsto:+123456789';
    const parsed = parseProtocol(rawSms);
    expect(parsed).not.toBeNull();
    expect(parsed!.scheme).toBe('smsto');
    expect(parsed!.path).toBe('+123456789');
    expect(parsed!.params.size).toBe(0);
  });

  it('parses standard web URL protocols and strips double slashes', () => {
    const rawUrl = 'https://google.com/search?q=query';
    const parsed = parseProtocol(rawUrl);
    expect(parsed).not.toBeNull();
    expect(parsed!.scheme).toBe('https');
    expect(parsed!.path).toBe('google.com/search');
    expect(parsed!.params.get('q')).toBe('query');
  });

  it('keeps path as-is for non-web protocols even with double slashes if not starting with //', () => {
    const rawCustom = 'custom:path//double';
    const parsed = parseProtocol(rawCustom);
    expect(parsed!.scheme).toBe('custom');
    expect(parsed!.path).toBe('path//double');
  });

  it('handles URLSearchParams parsing error safety', () => {
    // Mock URLSearchParams to throw on a specific query parameter
    const originalURLSearchParams = globalThis.URLSearchParams;
    class MockURLSearchParams {
      constructor() {
        throw new Error('Mock search params error');
      }
    }
    globalThis.URLSearchParams = MockURLSearchParams as any;

    try {
      const parsed = parseProtocol('https://google.com/path?param=value');
      expect(parsed).not.toBeNull();
      expect(parsed!.scheme).toBe('https');
      expect(parsed!.path).toBe('google.com/path');
      expect(parsed!.params.size).toBe(0); // Ignored due to catch block
    } finally {
      globalThis.URLSearchParams = originalURLSearchParams;
    }
  });

  it('catches overall execution crashes gracefully and returns null', () => {
    // If raw is null or undefined, calling raw.trim() throws TypeError
    const parsed = parseProtocol(null as any);
    expect(parsed).toBeNull();
  });
});
