
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
    expect(json['@type']).toBe('WebApplication');

    // Check for critical SEO properties
    expect(json.softwareVersion).toBe('0.1.0');
    expect(json.image).toBe('https://qrcraftly.com/og-image.png');
    expect(json.datePublished).toBe('2025-01-01');
    expect(json.browserRequirements).toBe('Requires JavaScript. Works in all modern browsers.');

    expect(json.author).toEqual({
      '@type': 'Organization',
      name: 'QRCraftly'
    });
  });
});
