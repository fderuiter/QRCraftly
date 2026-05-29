import { test, expect } from '@playwright/test';

test.describe('QR Code Scannability via Headless Browser', () => {
  test('generates scannable QR codes for various styles', async ({ page }) => {
    // We can evaluate code on the page, and we need jsqr to scan it.
    // Fortunately jsqr is available in the window context or we can inject it.
    // Let's inject jsqr from cdn.
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.addScriptTag({ path: 'node_modules/jsqr/dist/jsQR.js' });

    // Set a known value for the QR code
    const testUrl = 'https://qrcraftly.com/test-verification';
    const input = page.locator('input[type="text"], input[type="url"]').first();
    await input.fill(testUrl);
    await page.waitForTimeout(1000); // wait for debounce and render

    // Wait for the QR code to be rendered
    await page.waitForSelector('canvas[role="img"]');
    
    // We can interact with styles if there are buttons, but since we just want to verify 
    // the output, we can iterate over the styles in the DOM or just change them via UI.
    // Let's just check the default first.
    
    const checkScannability = async () => {
        return await page.evaluate(async (url) => {
            const canvas = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
            if (!canvas) return { error: 'No canvas' };
            const ctx = canvas.getContext('2d');
            if (!ctx) return { error: 'No context' };
            
            // Wait a small moment for drawing
            await new Promise(r => setTimeout(r, 100));

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // @ts-ignore
            if (typeof jsQR !== 'undefined') {
                // @ts-ignore
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
                if (code) {
                    return { success: true, data: code.data };
                }
            }
            return { error: 'Not scannable' };
        }, testUrl);
    };

    let result = await checkScannability();
    expect(result.success).toBe(true);
    expect(result.data).toBe(testUrl);

    // Now test a different style if we can click it.
    // The "Dots" style:
    const dotsButton = page.getByRole('button', { name: 'Dots', exact: true });
    if (await dotsButton.isVisible()) {
        await dotsButton.click();
        result = await checkScannability();
        expect(result.success).toBe(true);
        expect(result.data).toBe(testUrl);
    }
  });
});
