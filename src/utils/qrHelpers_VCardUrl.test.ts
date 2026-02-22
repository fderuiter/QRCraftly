
import { describe, it, expect } from 'vitest';
import { constructVCardString, VCardData } from './qr-formatters';

describe('VCard URL Normalization', () => {
  const baseData: VCardData = {
    firstName: 'John',
    lastName: 'Doe',
    organization: 'Acme',
    title: 'Dev',
    phone: '123',
    email: 'john@example.com',
    website: '',
    street: '',
    city: '',
    country: ''
  };

  it('should handle URL with spaces correctly (encode them)', () => {
    const data = { ...baseData, website: 'http://example.com/foo bar' };
    const result = constructVCardString(data);
    // Should be encoded as %20
    expect(result).toContain('URL:http://example.com/foo%20bar');
  });

  it('should handle URL without protocol by adding http://', () => {
    const data = { ...baseData, website: 'www.google.com' };
    const result = constructVCardString(data);
    // Should add protocol
    expect(result).toContain('URL:http://www.google.com/');
  });

  it('should not double-encode already encoded URL', () => {
    const data = { ...baseData, website: 'http://example.com/foo%20bar' };
    const result = constructVCardString(data);
    // Should remain %20, not %2520
    expect(result).toContain('URL:http://example.com/foo%20bar');
    expect(result).not.toContain('foo%2520bar');
  });

  it('should handle malformed URL gracefully (fallback to original)', () => {
    // A malformed URL that might throw in encodeURI is tricky because encodeURI handles most things.
    // A lone % is malformed for decodeURI, but encodeURI encodes it as %25.
    // So encodeURI won't throw for %.
    // However, new URL() throws for invalid URLs.
    // If we pass a string that is completely invalid for URL constructor:
    // new URL('http://example.com/%') throws? No, % is allowed in path?
    // Chrome: new URL('http://example.com/%').href -> 'http://example.com/%'
    // It normalizes it.

    // Let's try something really invalid for URL constructor.
    // "http:/" (missing slash?) -> valid?
    // "not a url" -> invalid protocol.
    const data = { ...baseData, website: 'not a url' };
    const result = constructVCardString(data);
    // Should probably just return it or encode it?
    // If we try 'http://not a url', it might fail validation because 'not a url' is not a valid hostname.
    // So it falls back to encodeURI('not a url') -> 'not%20a%20url'.
    expect(result).toContain('URL:not%20a%20url');
  });
});
