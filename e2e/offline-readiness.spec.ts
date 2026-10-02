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

  test('Requirement 3 & 4: Application successfully boots and renders offline from service worker cache', async ({ browserName, context, page }) => {
    test.skip(browserName !== 'chromium', 'Service worker offline page reloads via context.setOffline are only supported in Chromium in Playwright');
    // 1. Wait for Service Worker to register, install, and become active
    const isSwActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return true;
      
      // If there is no controller yet, wait for controllerchange
      return new Promise<boolean>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true });
        // Set fallback timeout
        setTimeout(() => resolve(!!navigator.serviceWorker.controller), 2000);
      });
    });

    expect(isSwActive).toBe(true);

    // Wait until precache assets are stored in CacheStorage
    await page.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          if (keys.length > 5) return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    });

    // 2. Set context offline to block all local server/network routing
    await context.setOffline(true);

    try {
      // 3. Reload the page (cold start simulation)
      await page.reload();

      // 4. Confirm the primary UI loads, completes hydration, and renders properly offline
      await page.waitForSelector('main[data-hydrated="true"]', { timeout: 10000 });
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      await expect(title).toContainText('Free QR Code Generator');
    } finally {
      // Reset offline state
      await context.setOffline(false);
    }
  });

  test('Dynamic redirect links and unknown routes are answered by the network, not the cached homepage', async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium', 'Service worker response inspection is only reliable in Chromium in Playwright');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return;
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        setTimeout(() => resolve(), 2000);
      });
    });
    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    const redirectResponse = await page.goto('/r/abc123');
    expect(redirectResponse?.fromServiceWorker()).toBe(false);

    // Unknown routes are passed through to the server, so its 404 reaches the page
    // instead of the precached homepage.
    const unknownResponse = await page.goto('/this-route-does-not-exist');
    expect(unknownResponse?.status()).toBe(404);

    const aboutResponse = await page.goto('/about');
    expect(aboutResponse?.fromServiceWorker()).toBe(true);
  });

  test('Constraint 1: Custom brand logo uploads are transient and fully cleared on page refresh', async ({ page }) => {
    // 1. Expand the Logo section and locate the logo file input (the section also holds the Mosaic QR upload)
    await page.getByRole('button', { name: 'Logo', exact: true }).click();
    const fileInput = page.getByRole('region', { name: 'Logo' }).getByLabel('Upload logo image');
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

  test('Constraint 2: Mosaic QR designs are transient and fully cleared on page refresh', async ({ page }) => {
    // Mosaic QR lives in the Logo section of the appearance accordion
    await page.getByRole('button', { name: 'Logo', exact: true }).click();
    const fileInput = page.getByRole('region', { name: 'Logo' }).getByLabel('Upload mosaic design', { exact: true });
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: 'test-mosaic.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      ),
    });

    const removeMosaic = page.getByRole('button', { name: 'Remove mosaic image' });
    await expect(removeMosaic).toBeVisible();

    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');

    await expect(page.getByRole('button', { name: 'Remove mosaic image' })).not.toBeVisible();
  });
});
