/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import HeadDefault from './Head';

// Hoist the mock function so it can be used inside vi.mock
const { mockUsePageContext } = vi.hoisted(() => {
  return { mockUsePageContext: vi.fn() };
});

// Mock usePageContext
vi.mock('vike-react/usePageContext', () => ({
  usePageContext: mockUsePageContext
}));

describe('HeadDefault', () => {
  // Default mock implementation
  beforeEach(() => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/',
      config: {
        title: 'Test Title',
        description: 'Test Desc'
      }
    });
    // Clear head
    document.head.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  it('includes a Content Security Policy (CSP) meta tag', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    const metaCSP = container.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(metaCSP).toBeInTheDocument();

    const content = metaCSP?.getAttribute('content') || '';
    expect(content).toContain("default-src 'self'");
  });

  it('includes Open Graph image dimensions', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    const width = container.querySelector('meta[property="og:image:width"]');
    expect(width).toBeInTheDocument();
    expect(width?.getAttribute('content')).toBe('1280');
  });

  it('generates correct breadcrumbs for home page', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/',
      config: {}
    });

    render(<HeadDefault />, { container: document.head });

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    // Find the one with BreadcrumbList
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));
    expect(breadcrumbScript).toBeDefined();

    const data = JSON.parse(breadcrumbScript!.textContent!);
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(1);
    expect(data.itemListElement[0].name).toBe('Home');
    expect(data.itemListElement[0].item).toBe('https://qrcraftly.com/');
  });

  it('generates correct breadcrumbs for About page', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/about',
      config: {}
    });

    render(<HeadDefault />, { container: document.head });

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));

    const data = JSON.parse(breadcrumbScript!.textContent!);
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[1].name).toBe('About');
    expect(data.itemListElement[1].item).toBe('https://qrcraftly.com/about');
  });

  it('generates correct breadcrumbs for WiFi QR Code page (with override)', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/wifi-qr-code',
      config: {}
    });

    render(<HeadDefault />, { container: document.head });

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));

    const data = JSON.parse(breadcrumbScript!.textContent!);
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[1].name).toBe('WiFi QR Code'); // Verify override works
    expect(data.itemListElement[1].item).toBe('https://qrcraftly.com/wifi-qr-code');
  });

  it('generates correct breadcrumbs for nested/unknown paths (dynamic formatting)', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/products/special-offer',
      config: {}
    });

    render(<HeadDefault />, { container: document.head });

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));

    const data = JSON.parse(breadcrumbScript!.textContent!);
    expect(data.itemListElement).toHaveLength(3);

    // Level 1: Products
    expect(data.itemListElement[1].position).toBe(2);
    expect(data.itemListElement[1].name).toBe('Products');
    expect(data.itemListElement[1].item).toBe('https://qrcraftly.com/products');

    // Level 2: Special Offer
    expect(data.itemListElement[2].position).toBe(3);
    expect(data.itemListElement[2].name).toBe('Special Offer'); // Verify capitalization and dash replacement
    expect(data.itemListElement[2].item).toBe('https://qrcraftly.com/products/special-offer');
  });

  it('handles 404 pages correctly (noindex, no canonical)', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/some-garbage-url',
      is404: true,
      config: {}
    });

    const { container } = render(<HeadDefault />, { container: document.head });

    // Check for noindex meta tag
    const metaRobots = container.querySelector('meta[name="robots"]');
    expect(metaRobots).toBeInTheDocument();
    expect(metaRobots?.getAttribute('content')).toBe('noindex, nofollow');

    // Check that canonical link is NOT present
    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeInTheDocument();

    // Check that breadcrumb schema is NOT generated for the garbage path
    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));

    // If breadcrumbs exist, ensure they don't include the 404 path
    if (breadcrumbScript) {
      const data = JSON.parse(breadcrumbScript!.textContent!);
      const garbageItem = data.itemListElement.find((item: any) => item.item?.includes('garbage'));
      expect(garbageItem).toBeUndefined();
    }
  });

  it('uses custom Open Graph image from config', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/custom-image-page',
      config: {
        image: '/custom-og-image.png',
        imageAlt: 'Custom OG Image Alt Text'
      }
    });

    const { container } = render(<HeadDefault />, { container: document.head });

    // Check og:image
    const ogImage = container.querySelector('meta[property="og:image"]');
    expect(ogImage).toBeInTheDocument();
    expect(ogImage?.getAttribute('content')).toBe('https://qrcraftly.com/custom-og-image.png');

    // Check og:image:alt
    const ogImageAlt = container.querySelector('meta[property="og:image:alt"]');
    expect(ogImageAlt).toBeInTheDocument();
    expect(ogImageAlt?.getAttribute('content')).toBe('Custom OG Image Alt Text');

    // Check twitter:image
    const twitterImage = container.querySelector('meta[name="twitter:image"]');
    expect(twitterImage).toBeInTheDocument();
    expect(twitterImage?.getAttribute('content')).toBe('https://qrcraftly.com/custom-og-image.png');

    // Check twitter:image:alt
    const twitterImageAlt = container.querySelector('meta[name="twitter:image:alt"]');
    expect(twitterImageAlt).toBeInTheDocument();
    expect(twitterImageAlt?.getAttribute('content')).toBe('Custom OG Image Alt Text');
  });

  it('falls back to default Open Graph image if config is missing', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/default-image-page',
      config: {}
    });

    const { container } = render(<HeadDefault />, { container: document.head });

    // Check og:image
    const ogImage = container.querySelector('meta[property="og:image"]');
    expect(ogImage).toBeInTheDocument();
    expect(ogImage?.getAttribute('content')).toBe('https://qrcraftly.com/og-image.png');

    // Check og:image:alt
    const ogImageAlt = container.querySelector('meta[property="og:image:alt"]');
    expect(ogImageAlt).toBeInTheDocument();
    expect(ogImageAlt?.getAttribute('content')).toBe('QRCraftly QR Code Example');
  });

  it('correctly resolves subdomains from the _subdomain/ path prefix', () => {
    mockUsePageContext.mockReturnValue({
      urlPathname: '/_subdomain/tenant1/about',
      config: {}
    });

    const { container } = render(<HeadDefault />, { container: document.head });

    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical).toBeInTheDocument();
    expect(canonical?.getAttribute('href')).toBe('https://tenant1.qrcraftly.com/about');

    const ogUrl = container.querySelector('meta[property="og:url"]');
    expect(ogUrl?.getAttribute('content')).toBe('https://tenant1.qrcraftly.com/about');

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('BreadcrumbList'));
    const data = JSON.parse(breadcrumbScript!.textContent!);

    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0].item).toBe('https://tenant1.qrcraftly.com/');
    expect(data.itemListElement[1].name).toBe('About');
    expect(data.itemListElement[1].item).toBe('https://tenant1.qrcraftly.com/about');
  });
});
