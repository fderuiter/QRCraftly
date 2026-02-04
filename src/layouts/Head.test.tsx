import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import HeadDefault from './Head';
import { usePageContext } from 'vike-react/usePageContext';

// Mock usePageContext dynamically
vi.mock('vike-react/usePageContext', () => ({
  usePageContext: vi.fn()
}));

describe('HeadDefault', () => {
  const mockUsePageContext = usePageContext as Mock;

  const defaultContext = {
    urlPathname: '/',
    config: {
      title: 'Test Title',
      description: 'Test Desc'
    }
  };

  beforeEach(() => {
    mockUsePageContext.mockReturnValue(defaultContext);
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
  });

  it('renders correct canonical link for root', () => {
    const { container } = render(<HeadDefault />, { container: document.head });
    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute('href', 'https://qrcraftly.com');
  });

  it('renders correct canonical link for subpages (normalizes trailing slash)', () => {
    mockUsePageContext.mockReturnValue({
      ...defaultContext,
      urlPathname: '/about/'
    });
    const { container } = render(<HeadDefault />, { container: document.head });
    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute('href', 'https://qrcraftly.com/about');
  });

  it('renders Open Graph tags correctly', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    expect(container.querySelector('meta[property="og:site_name"]')).toHaveAttribute('content', 'QRCraftly');
    expect(container.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    expect(container.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://qrcraftly.com');
    expect(container.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Test Title');
    expect(container.querySelector('meta[property="og:description"]')).toHaveAttribute('content', 'Test Desc');

    // Image tags
    expect(container.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://qrcraftly.com/og-image.png');

    // Verified assertions
    expect(container.querySelector('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    expect(container.querySelector('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  });

  it('renders Twitter Card tags correctly', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    expect(container.querySelector('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    expect(container.querySelector('meta[name="twitter:title"]')).toHaveAttribute('content', 'Test Title');
    expect(container.querySelector('meta[name="twitter:description"]')).toHaveAttribute('content', 'Test Desc');
    expect(container.querySelector('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://qrcraftly.com/og-image.png');
  });

  it('generates valid JSON-LD Structured Data', () => {
    const { container } = render(<HeadDefault />, { container: document.head });

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBeGreaterThanOrEqual(1);

    // Parse the WebSite schema
    const websiteScript = Array.from(scripts).find(s => s.textContent?.includes('"@type":"WebSite"'));
    expect(websiteScript).toBeDefined();

    const websiteData = JSON.parse(websiteScript!.textContent || '{}');
    expect(websiteData['@context']).toBe('https://schema.org');
    expect(websiteData.name).toBe('QRCraftly');
    expect(websiteData.url).toBe('https://qrcraftly.com');
  });

  it('generates correct Breadcrumb JSON-LD for subpages', () => {
    mockUsePageContext.mockReturnValue({
      ...defaultContext,
      urlPathname: '/about'
    });

    const { container } = render(<HeadDefault />, { container: document.head });

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const breadcrumbScript = Array.from(scripts).find(s => s.textContent?.includes('"@type":"BreadcrumbList"'));
    expect(breadcrumbScript).toBeDefined();

    const breadcrumbData = JSON.parse(breadcrumbScript!.textContent || '{}');
    expect(breadcrumbData.itemListElement).toHaveLength(2);
    expect(breadcrumbData.itemListElement[0].name).toBe('Home');
    expect(breadcrumbData.itemListElement[1].name).toBe('About');
    expect(breadcrumbData.itemListElement[1].item).toBe('https://qrcraftly.com/about');
  });
});
