import { test, expect } from './fixtures';
import jsQR from 'jsqr';

test.describe('QR Code Scannability via Headless Browser', () => {
  test('generates scannable QR codes for various styles', async ({ page }) => {
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
        const result = await page.evaluate(async () => {
            const canvas = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            
            // Wait a small moment for drawing
            await new Promise(r => setTimeout(r, 100));

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return {
                width: imageData.width,
                height: imageData.height,
                data: new Uint8Array(imageData.data.buffer)
            };
        });

        if (!result) {
            return null;
        }

        const uint8Data = new Uint8ClampedArray(result.data.buffer);
        const code = jsQR(uint8Data, result.width, result.height, { inversionAttempts: "attemptBoth" });
        return code ? code.data : undefined;
    };

    await expect.poll(async () => {
        return await checkScannability();
    }, {
        timeout: 15000,
        intervals: [500]
    }).toBe(testUrl);

    // Now test a different style if we can click it.
    const dotsButton = page.getByRole('button', { name: 'Dots', exact: true });
    if (await dotsButton.isVisible()) {
        await dotsButton.click();
        await expect.poll(async () => {
            return await checkScannability();
        }, {
            timeout: 15000,
            intervals: [500]
        }).toBe(testUrl);
    }
  });
});
