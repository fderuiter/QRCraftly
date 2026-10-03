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
 * evaluate throws during render and must be caught by the Appearance panel's error
 * boundary (#1055), leaving the rest of the generator working.
 * This exercises a real production failure mode (a broken or stale deploy chunk)
 * without any test-only hook in the shipped code (#983).
 */
const LAZY_CHUNK_MARKER = 'Layout & Border';

test.describe('Error Fallbacks and Recovery E2E Tests', () => {
  // Service workers answer chunk requests from their cache, which bypasses page.route.
  test.use({ serviceWorkers: 'block' });

  test('a lazily loaded chunk that fails to evaluate shows the panel fallback, and reload restores the app', async ({ page }) => {
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

    // 2. The panel's error boundary intercepts the render-time failure; the rest of the page keeps working
    const fallbackTitle = page.getByText('This panel hit a snag.');
    await expect(fallbackTitle).toBeVisible({ timeout: 15000 });
    expect(brokenChunks).toBeGreaterThan(0);
    await expect(page.getByText('Application Error')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reload panel' })).toBeVisible();
    await expect(page.locator('#url-input')).toBeVisible();

    // 3. Once the chunk is served intact again (e.g. the deploy finished), reloading restores the app
    // Wait for any chunk request still in the handler, so it can't fulfill an unrouted request.
    await page.unrouteAll({ behavior: 'wait' });
    await page.reload();

    const mainElement = page.locator('main[data-hydrated="true"]');
    await expect(mainElement).toBeVisible({ timeout: 15000 });

    const urlInput = page.locator('#url-input');
    await expect(urlInput).toBeVisible({ timeout: 15000 });

    // Ensure the fallback alert UI is no longer present
    await expect(fallbackTitle).not.toBeVisible();
  });
});
