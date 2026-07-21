import { test, expect } from '@playwright/test';

test.describe('Visual Regression Layout Checks', () => {
  test('Standard Desktop Viewport (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
    await page.waitForTimeout(1000); // Allow canvas to render
    await expect(page).toHaveScreenshot('desktop-standard.png', { fullPage: true });
  });

  test('Mobile Viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
    await page.waitForTimeout(1000); // Allow canvas to render
    await expect(page).toHaveScreenshot('mobile-standard.png', { fullPage: true });
  });

  test('High Zoom Viewport (480x270)', async ({ page }) => {
    // Simulates a 400% zoom level on a 1920x1080 screen
    await page.setViewportSize({ width: 480, height: 270 });
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
    await page.waitForTimeout(1000); // Allow canvas to render
    await expect(page).toHaveScreenshot('desktop-high-zoom.png', { fullPage: true });
  });
});
