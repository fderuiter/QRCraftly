import { test, expect } from '@playwright/test';

test.describe('QR Code Scannability via Headless Browser', () => {
  test('validates scannability status for module patterns', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const testUrl = 'https://qrcraftly.com/test-verification';
    const input = page.locator('input[type="text"], input[type="url"]').first();
    await input.fill(testUrl);

    await page.waitForSelector('canvas[role="img"]');
    await page.waitForSelector('text="Pattern Style"', { timeout: 30000 });

    const patternLabels = [
      'Standard Industrial',
      'The Hive'
    ];

    for (const label of patternLabels) {
        const button = page.getByRole('button', { name: `Select ${label} pattern` });
        
        await button.scrollIntoViewIfNeeded();
        await button.click();
        
        await expect(page.locator('text="Checking..."').first()).not.toBeVisible({ timeout: 15000 });

        const scannableLoc = page.locator('text="Scannable"').first();
        const lowLoc = page.locator('text="Low Scannability"').first();

        let isScannable = false;
        let isLow = false;

        for (let i = 0; i < 30; i++) {
            isScannable = await scannableLoc.isVisible();
            isLow = await lowLoc.isVisible();
            if (isScannable || isLow) break;
            await page.waitForTimeout(250);
        }
        
        console.log(`Pattern ${label}: Scannable: ${isScannable}, Low: ${isLow}`);
        expect(isScannable || isLow, `Pattern ${label} should show a scannability status`).toBe(true);

        if (label === 'The Hive' || label === 'Standard Industrial') {
            expect(isScannable, `${label} should pass scannability after geometry fix`).toBe(true);
        }
    }
  });
});
