import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeadDefault from './Head';

// Mock usePageContext since it's used in HeadDefault
vi.mock('vike-react/usePageContext', () => ({
  usePageContext: () => ({
    urlPathname: '/',
    config: {
      title: 'Test Title',
      description: 'Test Desc'
    }
  })
}));

describe('HeadDefault', () => {
  it('includes a Content Security Policy (CSP) meta tag', () => {
    // Render into document.head because meta tags are only valid there
    const { container } = render(<HeadDefault />, { container: document.head });

    // Note: container will be document.head

    const metaCSP = container.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(metaCSP).toBeInTheDocument();

    const content = metaCSP?.getAttribute('content') || '';

    expect(content).toContain("default-src 'self'");
    expect(content).toContain("object-src 'none'");
    expect(content).toContain("base-uri 'self'");
    expect(content).toContain("upgrade-insecure-requests");

    expect(content).toContain("script-src 'self' 'unsafe-inline'");
    expect(content).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(content).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(content).toContain("img-src 'self' data:");
  });

  it('includes explicit Open Graph image dimensions', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    const widthMeta = container.querySelector('meta[property="og:image:width"]');
    const heightMeta = container.querySelector('meta[property="og:image:height"]');

    expect(widthMeta).toBeInTheDocument();
    expect(widthMeta?.getAttribute('content')).toBe('1200');

    expect(heightMeta).toBeInTheDocument();
    expect(heightMeta?.getAttribute('content')).toBe('630');
  });
});
