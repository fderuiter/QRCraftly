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

import { test, expect } from '@playwright/test';

test.describe('Error Fallbacks and Recovery E2E Tests', () => {
  test('successfully triggers simulated crash, displays fallback recovery UI, and restores state on reload', async ({ page }) => {
    // Inject the test execution flag __E2E_TEST__ to enable the crash trigger in LayoutDefault
    await page.addInitScript(() => {
      (window as any).__E2E_TEST__ = true;
    });

    // Ignore the intentional crash pageerror
    page.on('pageerror', () => {});

    // 1. Navigate to the page with the crash trigger query parameter
    await page.goto('/?simulate-crash=true');

    // 2. The application should immediately intercept the exception and render the fallback layout
    const fallbackTitle = page.getByText('Application Error');
    await expect(fallbackTitle).toBeVisible({ timeout: 15000 });

    const fallbackText = page.getByText("We're sorry, but something went wrong while rendering this page.");
    await expect(fallbackText).toBeVisible();

    // 3. The recovery interface must present a Reload Page button
    const reloadButton = page.getByRole('button', { name: 'Reload Page' });
    await expect(reloadButton).toBeVisible();

    // 4. Clicking the reload control successfully restores the active application state (clearing the crash state)
    await reloadButton.click();

    // The page should have reloaded without the query parameters, which restores standard operation
    const mainElement = page.locator('main[data-hydrated="true"]');
    await expect(mainElement).toBeVisible({ timeout: 15000 });

    const urlInput = page.locator('#url-input');
    await expect(urlInput).toBeVisible({ timeout: 15000 });

    // Ensure the fallback alert UI is no longer present
    await expect(fallbackTitle).not.toBeVisible();
  });
});
