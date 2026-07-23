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


import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle, LogoPaddingStyle, QRErrorCorrectionLevel, SocialFormat, QRType } from '../types';
import QRCode from 'qrcode';

// Mock qrcode module


describe('QRCanvas Component', () => {
  let mockContext: any;
  let mockModules: any;
  let createdImages: any[];

  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history

    // Setup Mock Canvas Context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
    };

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

    // Setup Mock QRCode Data
    const size = 21;
    mockModules = {
      size: size,
      get: vi.fn().mockReturnValue(false),
    };
    
    // Default mock implementation for get
    mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 0 && c === 0) return true;
        return false;
    });

    (QRCode.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    createdImages = [];
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
      constructor() {
        createdImages.push(this);
      }
    }
    window.Image = MockImage as any;
  });

  
  it('renders correctly with default config', async () => {
    render(<QRCanvas config={DEFAULT_CONFIG} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('QR Code for website link to'));

    await waitFor(() => {
        expect(QRCode.create).toHaveBeenCalledWith(DEFAULT_CONFIG.value, { errorCorrectionLevel: QRErrorCorrectionLevel.H });
    });

    await waitFor(() => {
        expect(mockContext.clearRect).toHaveBeenCalled();
        expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);

        // Check drawing
        // expect(mockContext.beginPath).toHaveBeenCalled(); // STANDARD uses fillRect mainly
        expect(mockContext.fillRect).toHaveBeenCalled();
    });
  });

  it('renders different styles correctly (SWISS)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.SWISS };
    render(<QRCanvas config={config} />);

    await waitFor(() => {
         expect(QRCode.create).toHaveBeenCalled();
    });

    // SWISS uses arc for modules and eyes
    await waitFor(() => {
        expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  it('draws rounded rects for data modules when style is MODERN', async () => {
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true; 
        return false;
     });
     
     const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN };
     render(<QRCanvas config={config} />);
     
     await waitFor(() => {
        // Modern uses roundedRect (or shim)
        expect(mockContext.quadraticCurveTo).toHaveBeenCalled();
     });
  });

  it('draws star for data modules when style is STARBURST', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Star uses lineTo loop
          expect(mockContext.lineTo).toHaveBeenCalled();
          expect(mockContext.closePath).toHaveBeenCalled();
      });
  });

  it('draws hexagon for HIVE style', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
         // Hexagon loop 6 times
         expect(mockContext.lineTo).toHaveBeenCalled();
      });
  });

  it('handles logo rendering', async () => {
    const config = { ...DEFAULT_CONFIG, logoUrl: 'https://example.com/logo.png' };
    
    render(<QRCanvas config={config} />);

    // Wait for image to be created
    await waitFor(() => {
        expect(createdImages.length).toBeGreaterThan(0);
    });

    const img = createdImages[0];
    
    // Simulate load
    act(() => {
      if (img.onload) {
          img.complete = true;
          img.onload();
      }
    });

    await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  it('renders logo with circle padding', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'circle' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];
      act(() => {
        if (img.onload) { img.complete = true; img.onload(); }
      });

      await waitFor(() => {
          // Should draw a circle background (arc)
          expect(mockContext.arc).toHaveBeenCalled();
          expect(mockContext.drawImage).toHaveBeenCalled();
      });
  });

  it('renders logo with square padding', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'square' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];
      act(() => {
        if (img.onload) { img.complete = true; img.onload(); }
      });

      await waitFor(() => {
          // Should draw a rect background
          expect(mockContext.fillRect).toHaveBeenCalled();
          expect(mockContext.drawImage).toHaveBeenCalled();
      });
  });

  it('does not draw logo background when padding style is none', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'none' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];

      // Reset mock to check for subsequent calls
      mockContext.fillRect.mockClear();
      mockContext.arc.mockClear();
      mockContext.drawImage.mockClear();

      act(() => {
        if (img.onload) { img.complete = true; img.onload(); }
      });

      await waitFor(() => {
          expect(mockContext.drawImage).toHaveBeenCalled();
      });

      // Should NOT draw background for logo
      // Since we optimized rendering to do a full redraw on image load, we expect main background calls.
      // But we shouldn't see a "logo padding" call.
      // Standard QR: 1 bg + 1 module (0,0) + 3 eyes (2 fillRects each) = 8 calls?
      // Wait, eyes have fillRect (frame), clearShape, fillRect (hole), fillRect (eyeball)?
      // Standard Eye: fillRect (frame), clearShape -> clearRect, fillRect (hole), fillRect (eyeball).
      // So 3 fillRects per eye.
      // 3 * 3 = 9.
      // Background = 1.
      // Total 10.
      // Depending on re-renders, this might be 10 or 20
      expect([10, 20]).toContain(mockContext.fillRect.mock.calls.length);
      expect(mockContext.arc).not.toHaveBeenCalled();
  });

  it('handles logo loading error', async () => {
      const config = { ...DEFAULT_CONFIG, logoUrl: 'https://example.com/bad-logo.png' };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];

      // Simulate error
      act(() => {
        if (img.onerror) {
            img.onerror();
        }
      });

      // Should still finish rendering but without logo
      await waitFor(() => {
          // drawImage should NOT be called for the logo
          expect(mockContext.drawImage).not.toHaveBeenCalled();

          // Data modules are drawn using various context methods depending on style.
          // In standard mode, we might expect fillRect or rect.
          // Or at least, fill should be called for eye rendering or modules.
          // BUT, if mockModules.get returns false (except 0,0), we might not see many calls.
          // Let's just check that fillRect was called (for background)
          expect(mockContext.fillRect).toHaveBeenCalled();
      });
  });

  it('handles QR generation failure', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Make QRCode.create throw
      (QRCode.create as unknown as Mock).mockImplementationOnce(() => {
          throw new Error('Generation failed');
      });

      render(<QRCanvas config={DEFAULT_CONFIG} />);

      await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith("QR generation failed:", expect.any(Error));
      });

      consoleSpy.mockRestore();
  });

  it('does not render if value is empty', async () => {
    const config = { ...DEFAULT_CONFIG, value: '' };
    render(<QRCanvas config={config} />);
    
    await waitFor(() => {
       expect(mockContext.clearRect).toHaveBeenCalled();
    });
    
    expect(QRCode.create).not.toHaveBeenCalled();
  });

  it('does not render if value is empty and template mode is enabled', async () => {
    const config = { ...DEFAULT_CONFIG, value: '', enableTemplate: true, socialFormat: SocialFormat.STORY_9_16 };
    render(<QRCanvas config={config} size={1080} />);

    await waitFor(() => {
       expect(mockContext.clearRect).toHaveBeenCalled();
    });

    expect(QRCode.create).not.toHaveBeenCalled();

    // Check that canvas was sized correctly based on template height ratio
    const canvasElement = document.querySelector('canvas');
    expect(canvasElement?.width).toBe(1080);
    // STORY_9_16 height ratio = 1920 / 1080 = 1.7777...
    // Expected height = 1080 * 1.7777... = 1920
    expect(canvasElement?.height).toBe(1920);
  });

  it('should ensure the logo cutout does not exceed safe error correction limits', async () => {
    // Setup a scenario where user config would break the QR code
    // Version 3 (29x29)
    // Logo Size 0.35
    // Padding 4 modules

    // We mock the modules size to be small to exaggerate the issue
    const moduleCount = 29;
    mockModules.size = moduleCount;

    const dangerousConfig = {
      ...DEFAULT_CONFIG,
      value: 'https://example.com',
      logoUrl: 'https://example.com/logo.png', // valid url to trigger image loading
      logoSize: 0.35,
      logoPaddingStyle: 'square' as LogoPaddingStyle,
      logoPadding: 4,
    };

    render(<QRCanvas config={dangerousConfig} size={100} />);

    await waitFor(() => {
        expect(createdImages.length).toBeGreaterThan(0);
    });

    const img = createdImages[0];
    act(() => {
      if (img.onload) { img.complete = true; img.onload(); }
    });

    await waitFor(() => {
        // Find the logo background call. It should be the one centered.
        // displaySize 100. Center 50.
        const fillRectCalls = mockContext.fillRect.mock.calls;
        const logoBgCall = fillRectCalls.find((args: any[]) => {
            const [x, _y, w, h] = args;
            // Check if it's roughly square and centered
            return Math.abs(w - h) < 0.1 && w > 20 && w < 90 && Math.abs(x - (100-w)/2) < 2;
        });

        expect(logoBgCall).toBeDefined();
        const drawnWidth = logoBgCall[2];
        const relativeWidth = drawnWidth / 100;

        // This assertion ensures the fix is working
        // We want the relative width to be <= 0.50 (SAFE_AREA_RATIO) + buffer
        expect(relativeWidth).toBeLessThanOrEqual(0.51);
    });
  });

  describe('Type-Specific Descriptive Summaries', () => {
    it('WiFi QR Code includes SSID and encryption, omitting password', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.WIFI,
        value: 'WIFI:S:Guest-Net;T:WPA;P:secret123;H:false;;',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', "QR Code for WiFi network 'Guest-Net' with WPA security");
    });

    it('WiFi QR Code with no security handles encryption as no security', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.WIFI,
        value: 'WIFI:S:Open-Net;T:nopass;;',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', "QR Code for WiFi network 'Open-Net' with no security");
    });

    it('Google Meet QR Code includes platform name and meeting ID', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.MEETING,
        value: 'https://meet.google.com/abc-defg-hij',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for Google Meet conference, ID abc-defg-hij');
    });

    it('Zoom QR Code includes platform name and meeting ID, omitting passcode', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.MEETING,
        value: 'https://zoom.us/j/123456789?pwd=secretPassword',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for Zoom conference, ID 123456789');
    });

    it('Microsoft Teams QR Code includes platform name and meeting ID', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.MEETING,
        value: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_YTMzZTlhNzYtMmUzMy00Y2U4LTg5YTMtZmJiOTJkMzI5YWVi%40thread.v2/0?context=%7b%22Tid%22%3a%2272f988bf-86f1-41af-91ab-2d7cd011db47%22%2c%22Oid%22%3a%2254318c4c-a111-4ebc-8d19-4a9497e2012d%22%7d',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for Microsoft Teams conference, ID YTMzZTlhNzYtMmUzMy00Y2U4LTg5YTMtZmJiOTJkMzI5YWVi');
    });

    it('Email QR Code omits mailto: prefix and includes subject', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.EMAIL,
        value: 'mailto:jules@example.com?subject=Hello%20World&body=hi',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', "QR Code for email to jules@example.com with subject 'Hello World'");
    });

    it('Phone QR Code omits tel: prefix', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.PHONE,
        value: 'tel:+1234567890',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for phone call to +1234567890');
    });

    it('SMS QR Code includes body message and phone number', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.SMS,
        value: 'sms:+1234567890?body=Hello%20Friend',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', "QR Code for SMS message to +1234567890 with message 'Hello Friend'");
    });

    it('Social QR Code handles platforms and handles', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.SOCIAL,
        value: 'https://instagram.com/myusername',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', "QR Code for Instagram profile for myusername");
    });

    it('Payment QR Code describes currency/network and amount, omitting address', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.PAYMENT,
        value: 'ethereum:0x71C7656EC7ab88b098defB751B7401B5f6d8976F?amount=1.5&label=Invoice1',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for Ethereum payment of 1.5 for Invoice1');
    });

    it('vCard QR Code summarizes names and organization', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.VCARD,
        value: 'BEGIN:VCARD\nVERSION:3.0\nN:Smith;John\nORG:ACME Corp\nEND:VCARD',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('aria-label', 'QR Code for contact card for John Smith from ACME Corp');
    });

    it('Truncates summary to ensure total length stays under 120 characters', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        type: QRType.TEXT,
        value: 'This is an extremely long raw text content that will definitely exceed the maximum allowed screen-reader summary character constraint of one hundred and twenty total characters.',
      };
      render(<QRCanvas config={config} />);
      const canvas = screen.getByRole('img');
      const ariaLabel = canvas.getAttribute('aria-label') || '';
      expect(ariaLabel.length).toBeLessThanOrEqual(120);
      expect(ariaLabel).toBe('QR Code for text content \'This is an extremely long raw text content that will definitely exceed the maximum allowed ...');
    });
  });
});
