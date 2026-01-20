
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Page from './+Page';

// Mock QRTool to avoid rendering complex children
vi.mock('../../components/QRTool', () => ({
  default: () => <div data-testid="qr-tool-mock">QRTool</div>,
}));

describe('Home Page', () => {
  it('renders structured data with required SEO properties', () => {
    const { container } = render(<Page />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const json = JSON.parse(script?.textContent || '{}');
    expect(json['@context']).toBe('https://schema.org');

    // Updated to expect @graph array
    expect(json['@graph']).toBeDefined();
    expect(json['@graph']).toHaveLength(2); // WebApplication and HowTo

    const webApp = json['@graph'].find((item: any) => item['@type'] === 'WebApplication');
    expect(webApp).toBeDefined();

    // Check for critical SEO properties
    expect(webApp.softwareVersion).toBe('0.1.0');
    expect(webApp.image).toBe('https://qrcraftly.com/og-image.png');
    expect(webApp.datePublished).toBe('2025-01-01');
    expect(webApp.browserRequirements).toBe('Requires JavaScript. Works in all modern browsers.');

    expect(webApp.author).toEqual({
      '@type': 'Organization',
      name: 'QRCraftly'
    });

    // Check for HowTo schema
    const howTo = json['@graph'].find((item: any) => item['@type'] === 'HowTo');
    expect(howTo).toBeDefined();
    expect(howTo.name).toBe('How to Create a Custom QR Code');
    expect(howTo.image).toBe('https://qrcraftly.com/og-image.png');
    expect(howTo.step.length).toBeGreaterThan(0);
  });
});
