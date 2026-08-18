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

    // Evaluate window.localStorage to confirm it only ever contains telemetry preferences or is empty (no sensitive QR data)
    const localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    const nonTelemetryKeys = localKeys.filter(key => key !== 'qr-telemetry-opt-in');
    expect(nonTelemetryKeys).toEqual([]);

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

  test('Requirement 4: Assert that the telemetry preference persists its exact state across page reloads', async ({ page }) => {
    // 1. Locate the Opt-In button ("Yes, Help Fix This" or "Allow")
    const yesButton = page.getByRole('button', { name: /Yes, Help Fix This|Allow/i });
    await expect(yesButton).toBeVisible();

    // Click to Opt-In
    await yesButton.click();

    // Verify localStorage has the 'qr-telemetry-opt-in' set to 'true'
    let optInVal = await page.evaluate(() => window.localStorage.getItem('qr-telemetry-opt-in'));
    expect(optInVal).toBe('true');

    // Reload the page
    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');

    // Confirm telemetry option is still 'true' after reload
    optInVal = await page.evaluate(() => window.localStorage.getItem('qr-telemetry-opt-in'));
    expect(optInVal).toBe('true');

    // Confirm that the localStorage only contains 'qr-telemetry-opt-in' and no other keys
    let localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(localKeys).toEqual(['qr-telemetry-opt-in']);

    // Confirm sessionStorage is completely empty
    const sessionKeys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(sessionKeys).toEqual([]);
  });

  test('Requirement 4 (Alt): Assert that telemetry opt-out also persists its exact state across page reloads', async ({ page }) => {
    // 1. Locate the Opt-Out button ("No Thanks" or "No thanks")
    const noButton = page.getByRole('button', { name: /No Thanks|No thanks/i });
    await expect(noButton).toBeVisible();

    // Click to Opt-Out
    await noButton.click();

    // Verify localStorage has the 'qr-telemetry-opt-in' set to 'false'
    let optOutVal = await page.evaluate(() => window.localStorage.getItem('qr-telemetry-opt-in'));
    expect(optOutVal).toBe('false');

    // Reload the page
    await page.reload();
    await page.waitForSelector('main[data-hydrated="true"]');

    // Confirm telemetry option is still 'false' after reload
    optOutVal = await page.evaluate(() => window.localStorage.getItem('qr-telemetry-opt-in'));
    expect(optOutVal).toBe('false');

    // Confirm that the localStorage only contains 'qr-telemetry-opt-in' and no other keys
    let localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(localKeys).toEqual(['qr-telemetry-opt-in']);

    // Confirm sessionStorage is completely empty
    const sessionKeys = await page.evaluate(() => Object.keys(window.sessionStorage));
    expect(sessionKeys).toEqual([]);
  });
});
