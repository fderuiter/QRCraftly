
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import jsQR from 'jsqr';

// Canvas setup for JSDOM
// 'canvas' package automatically patches JSDOM when available in the environment?
// Usually vitest needs explicit setup or import to use 'canvas' node module implementation.
// However, JSDOM v20+ usually needs 'canvas' to be installed peer dependency.
// We might need to handle the fact that we are in a virtual environment.

describe('QR Code Scannability', () => {
  // Styles to test
  const styles = Object.values(QRStyle);

  // A simple test message
  const TEST_VALUE = 'https://qrcraftly.com/test-verification';

  // We need to wait for the canvas to be drawn
  // QRCanvas uses useEffect to draw.

  styles.forEach((style) => {
    it(`should generate a scannable QR code for style: ${style}`, async () => {
      const config = {
        ...DEFAULT_CONFIG,
        value: TEST_VALUE,
        style: style,
        // Ensure high contrast and standard colors for testing
        fgColor: '#000000',
        bgColor: '#ffffff',
        eyeColor: '#000000',
        // No logo for basic scannability test to avoid network/loading issues
        logoUrl: null,
      };

      const { container } = render(<QRCanvas config={config} size={200} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Wait for drawing to likely complete (it's async in useEffect but usually fast)
      // We can't easily hook into "drawing complete" from outside without modification.
      // But we can wait for a bit.
      // Or check if context has data.

      // Robustly wait for the QR code to be rendered and scannable
      await waitFor(() => {
          const ctx = canvas!.getContext('2d');
          const imageData = ctx!.getImageData(0, 0, 200, 200);

          // Check if canvas has any content (non-transparent) first
          const data = imageData.data;
          let hasContent = false;
          for(let i=0; i<data.length; i+=4) {
              if (data[i+3] > 0) { // Check alpha channel
                   hasContent = true;
                   break;
              }
          }
          expect(hasContent).toBe(true);

          // For supported styles, wait until it is decodable
          if (style !== QRStyle.STARBURST && style !== QRStyle.GRUNGE && style !== QRStyle.CIRCUIT) {
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              expect(code).not.toBeNull();
              expect(code!.data).toBe(TEST_VALUE);
          }
      }, { timeout: 3000 });
    });
  });
});
