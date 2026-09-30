/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

import { test, expect, type Route } from '@playwright/test';

/**
 * Text that only the lazily loaded StyleControls chunk contains. The home page
 * imports that chunk with `React.lazy` after hydration, so a chunk that fails to
 * evaluate throws during render and must be caught by the layout's ErrorBoundary.
 * This exercises a real production failure mode (a broken or stale deploy chunk)
 * without any test-only hook in the shipped code (#983).
 */
const LAZY_CHUNK_MARKER = 'Layout & Border';

test.describe('Error Fallbacks and Recovery E2E Tests', () => {
  // Service workers answer chunk requests from their cache, which bypasses page.route.
  test.use({ serviceWorkers: 'block' });

  test('a lazily loaded chunk that fails to evaluate shows the fallback UI, and reload restores the app', async ({ page }) => {
    let brokenChunks = 0;
    const breakLazyChunk = async (route: Route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(LAZY_CHUNK_MARKER)) {
        brokenChunks += 1;
        await route.fulfill({
          status: 200,
          contentType: 'text/javascript',
          headers: { 'cache-control': 'no-store' },
          body: "throw new Error('Simulated broken deploy chunk');",
        });
        return;
      }
      await route.fulfill({ response, body });
    };
    await page.route('**/*.js', breakLazyChunk);

    // Ignore the intentional chunk evaluation error
    page.on('pageerror', () => {});

    // 1. Load the generator; its Appearance panel lazily imports the broken chunk after hydration
    await page.goto('/');

    // 2. The ErrorBoundary intercepts the render-time failure and shows the fallback layout
    const fallbackTitle = page.getByText('Application Error');
    await expect(fallbackTitle).toBeVisible({ timeout: 15000 });
    expect(brokenChunks).toBeGreaterThan(0);

    const fallbackText = page.getByText("We're sorry, but something went wrong while rendering this page.");
    await expect(fallbackText).toBeVisible();

    // 3. The recovery interface must present a Reload Page button
    const reloadButton = page.getByRole('button', { name: 'Reload Page' });
    await expect(reloadButton).toBeVisible();

    // 4. Once the chunk is served intact again (e.g. the deploy finished), reloading restores the app
    await page.unroute('**/*.js', breakLazyChunk);
    await reloadButton.click();

    const mainElement = page.locator('main[data-hydrated="true"]');
    await expect(mainElement).toBeVisible({ timeout: 15000 });

    const urlInput = page.locator('#url-input');
    await expect(urlInput).toBeVisible({ timeout: 15000 });

    // Ensure the fallback alert UI is no longer present
    await expect(fallbackTitle).not.toBeVisible();
  });
});
