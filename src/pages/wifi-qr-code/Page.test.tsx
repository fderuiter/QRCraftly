
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Page from './+Page';

// Mock QRTool component since we only want to test if it's passed correct props
vi.mock('../../components/QRTool', () => ({
  default: ({ initialConfig }: any) => (
    <div data-testid="qr-tool-mock">
      QRTool with type: {initialConfig?.type}
    </div>
  ),
}));

describe('WiFi QR Code Page', () => {
  it('renders QRTool with WiFi configuration', () => {
    render(<Page />);
    
    const qrTool = screen.getByTestId('qr-tool-mock');
    expect(qrTool).toBeInTheDocument();
    expect(qrTool).toHaveTextContent('QRTool with type: WIFI');
  });

  it('renders structured data schema', () => {
    const { container } = render(<Page />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    const json = JSON.parse(script?.textContent || '{}');
    expect(json['@context']).toBe('https://schema.org');
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

    // Check HowTo schema properties
    const howTo = json['@graph'].find((item: any) => item['@type'] === 'HowTo');
    expect(howTo).toBeDefined();
    expect(howTo.totalTime).toBe('PT1M');
    expect(howTo.estimatedCost).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '0'
    });

    expect(howTo.supply).toHaveLength(3);
    expect(howTo.supply[0].name).toBe('WiFi Network Name (SSID)');
    expect(howTo.supply[1].name).toBe('WiFi Password');
    expect(howTo.supply[2].name).toBe('Encryption Type');

    expect(howTo.tool).toHaveLength(1);
    expect(howTo.tool[0].name).toBe('QRCraftly WiFi Generator');

    expect(howTo.step).toHaveLength(4);
  });
});
