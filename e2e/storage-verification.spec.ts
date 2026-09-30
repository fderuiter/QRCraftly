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

/**
 * Transition and Storage Verification Spec
 * 
 * Verifies that page transitions/reloads wipe user-configured sessions and return
 * the generator to standard defaults, and programmatically evaluates browser storage
 * to ensure no leakage of sensitive QR configurations.
 */

test.describe('Transition & Storage Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage first
    await page.goto('/');
    // Completely clear both storage scopes before each test to ensure isolation
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    // Reload to ensure a clean state
    await page.reload();
    // Always wait for the application to complete hydration
    await page.waitForSelector('main[data-hydrated="true"]');
  });

  test('Requirement 1: Configure custom QR input and assert that page reload restores the default state', async ({ page }) => {
    const urlInput = page.locator('#url-input');
    await expect(urlInput).toBeVisible();

    // 1. Capture the original default value of the URL input
    const defaultValue = await urlInput.inputValue();
    expect(defaultValue).toBeTruthy();

    // 2. Configure a custom sensitive QR code input
    const sensitiveValue = 'https://sensitive.example.com/patient-record-998811';
    await urlInput.fill(sensitiveValue);
    await expect(urlInput).toHaveValue(sensitiveValue);

    // 3. Reload the page (simulated transition/refresh session)
    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');

    // 4. Assert that reloading restores the default state completely
    const reloadedInput = page.locator('#url-input');
    await expect(reloadedInput).toHaveValue(defaultValue);
    await expect(reloadedInput).not.toHaveValue(sensitiveValue);
  });

  test('Requirement 2 & 3: Programmatically evaluate sessionStorage and localStorage for QR state safety', async ({ page }) => {
    const urlInput = page.locator('#url-input');
    await expect(urlInput).toBeVisible();

    // Fill custom QR code input
    const sensitiveValue = 'https://super-secret-credentials.com/auth?token=abcdef';
    await urlInput.fill(sensitiveValue);
    await expect(urlInput).toHaveValue(sensitiveValue);

    // Evaluate window.sessionStorage to confirm it remains completely empty
    const sessionKeys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(sessionKeys).toEqual([]);

    // Evaluate window.localStorage to confirm it only ever holds the colour-theme preference or is empty (no QR data)
    const localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    const nonThemeKeys = localKeys.filter(key => key !== 'qrcraftly:theme');
    expect(nonThemeKeys).toEqual([]);

    // Double check that the sensitive value itself is nowhere in storage
    const fullLocalStorage = await page.evaluate(() => ({ ...window.localStorage }));
    const fullSessionStorage = await page.evaluate(() => ({ ...window.sessionStorage }));

    for (const [key, value] of Object.entries(fullLocalStorage)) {
      expect(key).not.toContain('sensitive');
      expect(key).not.toContain('token');
      expect(value).not.toContain('sensitive');
      expect(value).not.toContain('token');
    }

    for (const [key, value] of Object.entries(fullSessionStorage)) {
      expect(key).not.toContain('sensitive');
      expect(key).not.toContain('token');
      expect(value).not.toContain('sensitive');
      expect(value).not.toContain('token');
    }
  });

  test('Requirement 4: No diagnostics consent is asked for or stored, and nothing is sent to another origin', async ({ page }) => {
    const pageOrigin = new URL(page.url()).origin;
    const foreignRequests: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== pageOrigin) foreignRequests.push(request.url());
    });

    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');
    await page.locator('#url-input').fill('https://example.com/private');

    await expect(page.getByRole('button', { name: /^Allow$|No thanks/i })).toHaveCount(0);
    const localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(localKeys.filter(key => key !== 'qrcraftly:theme')).toEqual([]);
    expect(foreignRequests).toEqual([]);
  });

  test('Requirement 5: The no-ads pledge page is linked from the footer', async ({ page }) => {
    await page.getByRole('link', { name: 'No-Ads Pledge' }).first().click();
    await expect(page).toHaveURL(/\/free-forever$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('QRCraftly is not ad supported, and it never will be.');
  });
});
