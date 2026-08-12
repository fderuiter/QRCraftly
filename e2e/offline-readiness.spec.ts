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

import { test, expect } from './fixtures';

test.describe('Automated Workbox Precaching and Offline Readiness', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage first to allow SW registration
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
  });

  test('Requirement 3 & 4: Application successfully boots and renders offline from service worker cache', async ({ context, page }) => {
    // 1. Wait for Service Worker to register, install, and become active
    const isSwActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return true;
      
      // If there is no controller yet, wait for controllerchange
      return new Promise<boolean>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true });
        // Set fallback timeout
        setTimeout(() => resolve(!!navigator.serviceWorker.controller), 2000);
      });
    });

    expect(isSwActive).toBe(true);

    // 2. Set context offline to block all local server/network routing
    await context.setOffline(true);

    try {
      // 3. Reload the page (cold start simulation)
      await page.reload();

      // 4. Confirm the primary UI loads, completes hydration, and renders properly offline
      await page.waitForSelector('main[data-hydrated="true"]', { timeout: 5000 });
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      await expect(title).toContainText('QRCraftly');
    } finally {
      // Reset offline state
      await context.setOffline(false);
    }
  });

  test('Constraint 1: Custom brand logo uploads are transient and fully cleared on page refresh', async ({ page }) => {
    // 1. Locate the Logo upload button or the input file element
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // 2. Simulate uploading a custom brand logo image
    const sampleLogoBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fileInput.setInputFiles({
      name: 'test-logo.png',
      mimeType: 'image/png',
      buffer: sampleLogoBuffer
    });

    // 3. Assert the logo has been loaded (e.g. the remove button or Custom Logo preview text appears)
    const customLogoText = page.getByText('Custom Logo');
    await expect(customLogoText).toBeVisible();

    // 4. Perform a page refresh/reload
    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');

    // 5. Verify the custom brand logo state has been fully wiped and reset
    await expect(page.getByText('Custom Logo')).not.toBeVisible();
  });
});
