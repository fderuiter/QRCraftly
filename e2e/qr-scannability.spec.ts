import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';

test.describe('QR Code Scannability via Headless Browser', () => {
  test('generates scannable QR codes for various styles', async ({ page }) => {
    const jsQRContent = fs.readFileSync(path.resolve('node_modules/jsqr/dist/jsQR.js'), 'utf8');

    await page.goto('/');

    // Wait for hydration to complete
    await page.waitForSelector('main[data-hydrated="true"]');

    // Wait for the URL input to be visible
    const input = page.locator('#url-input');
    await input.waitFor({ state: 'visible' });

    // Set a known value for the QR code
    const testUrl = 'https://qrcraftly.com/test-verification';
    await input.fill(testUrl);
    await expect(input).toHaveValue(testUrl);

    // Wait for the QR code to be rendered
    await page.waitForSelector('canvas[role="img"]');
    
    const checkScannability = async () => {
        return await page.evaluate(async ({ url, jsQRScript }) => {
            const canvas = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
            if (!canvas) return { error: 'No canvas' };
            const ctx = canvas.getContext('2d');
            if (!ctx) return { error: 'No context' };
            
            // Wait a small moment for drawing
            await new Promise(r => setTimeout(r, 100));

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Inject jsQR if not present
            if (typeof (window as any).jsQR === 'undefined') {
                const script = document.createElement('script');
                script.textContent = jsQRScript;
                document.head.appendChild(script);
            }

            // @ts-ignore
            if (typeof jsQR !== 'undefined') {
                // @ts-ignore
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
                if (code) {
                    return { success: true, data: code.data };
                }
            }
            return { error: 'Not scannable' };
        }, { url: testUrl, jsQRScript: jsQRContent });
    };

    await expect.poll(async () => {
        const result = await checkScannability();
        return result.data;
    }, { timeout: 15000 }).toBe(testUrl);

    // Now test a different style if we can click it.
    const dotsButton = page.getByRole('button', { name: 'Dots', exact: true });
    if (await dotsButton.isVisible()) {
        await dotsButton.click();
        await expect.poll(async () => {
            const result = await checkScannability();
            return result.data;
        }, { timeout: 15000 }).toBe(testUrl);
    }
  });
});
