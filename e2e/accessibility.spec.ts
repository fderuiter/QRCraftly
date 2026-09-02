import { test, expect } from './fixtures';
import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Custom auditing helper that filters out native browser color input artifacts.
 * This prevents false-positive WCAG failures from empty or default color picker frames.
 */
async function runAccessibilityScan(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('input[type="color"]') // Filter out native browser color pickers
    .analyze();

  return accessibilityScanResults;
}

test.describe('Accessibility Suite', () => {
  test('dynamic UI patterns and accordions pass WCAG audits', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to hydrate
    await page.waitForSelector('main[data-hydrated="true"]');

    // Expand accordion panels if any are present (excluding popup/dropdown triggers)
    const accordions = await page.locator('aside button[aria-expanded="false"]:not([aria-haspopup="true"])').all();
    for (const accordion of accordions) {
      if (await accordion.isVisible()) {
        await accordion.click();
      }
    }
    
    // Run scan on expanded state
    const expandedScan = await runAccessibilityScan(page);
    expect(expandedScan.violations).toEqual([]);
    
    // Create custom-colored layouts and trigger a warning
    const fgColorInput = page.locator('input#fg-color');
    await fgColorInput.fill('#ffffff');

    const bgColorInput = page.locator('input#bg-color');
    await bgColorInput.fill('#ffffff');

    const eyeColorInput = page.locator('input#eye-color');
    await eyeColorInput.fill('#ff0000');

    // Wait for contrast warning text
    await page.waitForSelector('text=Warning: The contrast ratio is low', { timeout: 5000 });

    // Trigger the warning modal by initiating a download export
    const downloadMenuButton = page.getByRole('button', { name: 'Download', exact: true });
    await downloadMenuButton.click();
    const pngOption = page.getByRole('menuitem', { name: /PNG/i });
    await pngOption.click();
    await page.waitForSelector('text=Scan Safety Warning', { timeout: 5000 });

    // Run scan on warning state
    const warningScan = await runAccessibilityScan(page);
    expect(warningScan.violations).toEqual([]);
  });
});
