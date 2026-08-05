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

import { describe, it, expect, vi } from 'vitest';
import { generateQRSvg } from './svgExport';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle, QRConfig, SocialFormat, TemplateStyle, QRType } from '../types';

describe('generateQRSvg', () => {
  it('returns a valid SVG string for a basic URL', async () => {
    const svg = await generateQRSvg(DEFAULT_CONFIG as QRConfig);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('includes the correct viewport dimensions for SQUARE_1_1 (1080x1080)', async () => {
    const svg = await generateQRSvg(DEFAULT_CONFIG as QRConfig);
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1080"');
    expect(svg).toContain('viewBox="0 0 1080 1080"');
  });

  it('encodes foreground colour in generated paths', async () => {
    const config = { ...DEFAULT_CONFIG, fgColor: '#123456' } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('#123456');
  });

  it('encodes background colour in generated paths', async () => {
    const config = { ...DEFAULT_CONFIG, bgColor: '#abcdef' } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('#abcdef');
  });

  it('produces SVG for MODERN style (rounded rects)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<svg');
    // MODERN uses roundRect which produces Q (quadratic Bezier) path commands
    expect(svg).toContain('Q');
  });

  it('produces SVG for SWISS style (circles)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.SWISS } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<svg');
    // SWISS uses arcs (converted to C commands in SVG path)
    expect(svg).toContain(' C ');
  });

  it('produces SVG for FLUID style (circles)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.FLUID } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<svg');
    expect(svg).toContain(' C ');
  });

  it('produces SVG for GRUNGE style', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.GRUNGE } as QRConfig;
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });

  it('includes border background when border is enabled', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG as QRConfig,
      isBorderEnabled: true,
      borderSize: 0.05,
      borderColor: '#ff0000',
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('#ff0000');
  });

  it('includes border text when provided', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG as QRConfig,
      isBorderEnabled: true,
      borderSize: 0.05,
      borderText: 'Scan Me',
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('Scan Me');
    expect(svg).toContain('<text');
  });

  it('embeds logo image element when logoUrl is provided', async () => {
    // Mock fetch so toDataUrl returns the URL unchanged
    global.fetch = vi.fn().mockRejectedValue(new Error('no fetch in tests'));

    const config: QRConfig = {
      ...DEFAULT_CONFIG as QRConfig,
      logoUrl: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<image');
    expect(svg).toContain('data:image/png;base64,iVBORw0KGgo=');
  });

  it('omits the image if FileReader fails', async () => {
    const originalFileReader = global.FileReader;
    const originalFetch = global.fetch;

    try {
      // Create a mock FileReader that immediately triggers onerror
      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        readAsDataURL() {
          if (this.onerror) {
            this.onerror(new Error('Mocked FileReader error'));
          }
        }
      }

      global.FileReader = MockFileReader as any;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['fake data'], { type: 'image/png' })),
      });

      const config: QRConfig = {
        ...DEFAULT_CONFIG as QRConfig,
        logoUrl: 'http://example.com/logo.png',
      };

      const svg = await generateQRSvg(config);

      expect(svg).not.toContain('<image');
      expect(svg).not.toContain('href="http://example.com/logo.png"');
    } finally {
      global.FileReader = originalFileReader;
      global.fetch = originalFetch;
    }
  });

  it('gracefully handles an empty value string', async () => {
    // qrcode.create() throws for empty input; generateQRSvg should not crash
    const config = { ...DEFAULT_CONFIG, value: '' } as QRConfig;
    // Should reject/throw - wrapped in try/catch by the caller
    await expect(generateQRSvg(config)).rejects.toThrow();
  });

  it('generates a 9:16 SVG with 1080x1920 dimensions', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      socialFormat: SocialFormat.STORY_9_16,
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1920"');
    expect(svg).toContain('viewBox="0 0 1080 1920"');
  });

  it('generates a 4:5 SVG with 1080x1350 dimensions', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      socialFormat: SocialFormat.PORTRAIT_4_5,
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1350"');
    expect(svg).toContain('viewBox="0 0 1080 1350"');
  });

  it('includes template headline text in the SVG when a template is active', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateHeadline: 'My Headline',
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('My Headline');
  });

  it('applies horizontal scaling attributes to long template headlines in the exported SVG', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.MINIMALIST,
      templateHeadline: 'Extremely long headline that goes way beyond normal boundaries and should be compressed horizontally',
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('Extremely long headline that goes way beyond normal boundaries and should be compressed horizontally');
    expect(svg).toContain('textLength=');
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"');
  });

  it('omits the image if a malicious protocol is used', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      logoUrl: 'javascript:alert("xss")',
    };

    const svg = await generateQRSvg(config);
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('javascript:');
  });

  it('omits the image if a non-image data URL is used', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      logoUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    };

    const svg = await generateQRSvg(config);
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('data:text/html');
  });

  it('omits the image if FileReader fails to read blob', async () => {
    // Mock fetch to successfully return a blob
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['fake data'], { type: 'image/png' })),
    } as any);

    // Mock FileReader to fail when readAsDataURL is called
    const originalFileReader = global.FileReader;
    class MockFileReader {
      onerror: () => void = () => {};
      readAsDataURL() {
        this.onerror();
      }
    }
    global.FileReader = MockFileReader as any;

    try {
      const config: QRConfig = {
        ...(DEFAULT_CONFIG as QRConfig),
        logoUrl: 'https://example.com/fail-logo.png',
      };

      const svg = await generateQRSvg(config);

      // The error should be caught by the try/catch,
      // and it should gracefully omit the external URL entirely.
      expect(svg).not.toContain('<image');
      expect(svg).not.toContain('https://example.com/fail-logo.png');
    } finally {
      global.FileReader = originalFileReader;
      global.fetch = originalFetch;
    }
  });

  it('omits fr attribute for radial gradients in GRADIENT_BLUR visual template background export', async () => {
    const config: QRConfig = {
      ...(DEFAULT_CONFIG as QRConfig),
      templateStyle: TemplateStyle.GRADIENT_BLUR,
    };
    const svg = await generateQRSvg(config);
    expect(svg).toContain('<radialGradient');
    expect(svg).not.toContain('fr=');
  });

  describe('Accessibility tags in exported SVG', () => {
    it('generates correct title and description for a WiFi QR code', async () => {
      const config: QRConfig = {
        ...(DEFAULT_CONFIG as QRConfig),
        type: QRType.WIFI,
        value: 'WIFI:T:WPA;S:MyHomeWiFi;P:secretpassword;;',
      };
      const svg = await generateQRSvg(config);
      expect(svg).toContain('<title>WiFi Network QR Code</title>');
      expect(svg).toContain('<desc>MyHomeWiFi</desc>');
    });

    it('generates correct title and description for a URL QR code', async () => {
      const config: QRConfig = {
        ...(DEFAULT_CONFIG as QRConfig),
        type: QRType.URL,
        value: 'https://qrcraftly.com/some-page',
      };
      const svg = await generateQRSvg(config);
      expect(svg).toContain('<title>URL QR Code</title>');
      expect(svg).toContain('<desc>https://qrcraftly.com/some-page</desc>');
    });

    it('generates correct title and description for a Contact (vCard) QR code', async () => {
      const config: QRConfig = {
        ...(DEFAULT_CONFIG as QRConfig),
        type: QRType.VCARD,
        value: 'BEGIN:VCARD\nVERSION:3.0\nN:Smith;John\nFN:John Smith\nORG:A11y Corp\nEND:VCARD',
      };
      const svg = await generateQRSvg(config);
      expect(svg).toContain('<title>Contact QR Code</title>');
      expect(svg).toContain('<desc>John Smith</desc>');
    });

    it('generates correct title and description for an SMS QR code', async () => {
      const config: QRConfig = {
        ...(DEFAULT_CONFIG as QRConfig),
        type: QRType.SMS,
        value: 'SMSTO:+1234567890:Hello there',
      };
      const svg = await generateQRSvg(config);
      expect(svg).toContain('<title>SMS QR Code</title>');
      expect(svg).toContain('<desc>+1234567890</desc>');
    });
  });
});
