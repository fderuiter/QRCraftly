import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPublicDomain,
  resolveDomainForPath,
  getSanitizedPath,
  resolvePublicUrl,
  resolveImageUrl,
} from './metadataEngine';

describe('metadataEngine', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getPublicDomain', () => {
    it('returns default domain when VITE_DOMAIN is not set', () => {
      vi.stubEnv('VITE_DOMAIN', '');
      expect(getPublicDomain()).toBe('https://qrcraftly.com');
    });

    it('returns configured VITE_DOMAIN with trailing slashes stripped', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://test.qrcraftly.com///');
      expect(getPublicDomain()).toBe('https://test.qrcraftly.com');
    });
  });

  describe('resolveDomainForPath', () => {
    it('returns default domain when no path is provided', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveDomainForPath('')).toBe('https://qrcraftly.com');
    });

    it('adds leading slash if path does not have one', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveDomainForPath('_subdomain/foo')).toBe('https://foo.qrcraftly.com');
    });

    it('resolves standard path to public domain', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveDomainForPath('/about')).toBe('https://qrcraftly.com');
    });

    it('resolves subdomain path to a subdomain of public domain', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveDomainForPath('/_subdomain/tenant1/about')).toBe('https://tenant1.qrcraftly.com');
    });

    it('falls back to public domain when URL construction fails due to malformed domain', () => {
      vi.stubEnv('VITE_DOMAIN', 'invalid-domain-no-protocol');
      // This will make new URL(domain) throw, triggering catch block
      expect(resolveDomainForPath('/_subdomain/tenant1')).toBe('invalid-domain-no-protocol');
    });
  });

  describe('getSanitizedPath', () => {
    it('returns / if path is empty/falsy', () => {
      expect(getSanitizedPath('')).toBe('/');
    });

    it('adds leading slash if path does not have one', () => {
      expect(getSanitizedPath('about')).toBe('/about');
    });

    it('sanitizes subdomain prefixes', () => {
      expect(getSanitizedPath('/_subdomain/tenant1/about')).toBe('/about');
    });

    it('returns / if subdomain path has no remainder', () => {
      expect(getSanitizedPath('/_subdomain/tenant1')).toBe('/');
    });

    it('returns / if path starts with /_subdomain but does not match pattern', () => {
      expect(getSanitizedPath('/_subdomain')).toBe('/');
    });
  });

  describe('resolvePublicUrl', () => {
    it('compiles public url correctly', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolvePublicUrl('/about')).toBe('https://qrcraftly.com/about');
    });

    it('compiles root path without trailing slash', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolvePublicUrl('/')).toBe('https://qrcraftly.com');
    });

    it('compiles and strips trailing slash from other paths', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolvePublicUrl('/about/')).toBe('https://qrcraftly.com/about');
    });

    it('compiles subdomain paths correctly', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolvePublicUrl('/_subdomain/tenant/dashboard/')).toBe('https://tenant.qrcraftly.com/dashboard');
    });
  });

  describe('resolveImageUrl', () => {
    it('returns default og-image when config is empty', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveImageUrl(undefined, '/about')).toBe('https://qrcraftly.com/og-image.png');
    });

    it('returns absolute imageUrl if config starts with http', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveImageUrl('https://externalsite.com/img.png', '/about')).toBe('https://externalsite.com/img.png');
    });

    it('returns prefixed domain image if config starts with slash', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveImageUrl('/custom-og.png', '/about')).toBe('https://qrcraftly.com/custom-og.png');
    });

    it('returns prefixed domain image if config is relative path without slash', () => {
      vi.stubEnv('VITE_DOMAIN', 'https://qrcraftly.com');
      expect(resolveImageUrl('custom-og.png', '/about')).toBe('https://qrcraftly.com/custom-og.png');
    });
  });
});
