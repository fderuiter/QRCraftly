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

import { test, expect } from './fixtures';

/**
 * Throttled E2E Interactive Performance Testing
 *
 * Simulates mobile hardware degradation (4x and 6x CPU throttling rate)
 * and tests multiple user flows (complex style switches, tab switches & text input).
 * Monitors and asserts on main-thread long tasks using hardware-agnostic budgets:
 * - 60ms under 4x CPU slowdown (calibrated to the agent hardware speed)
 * - 150ms under 6x CPU slowdown (calibrated to the agent hardware speed)
 */

test.describe('Throttled Interactive Performance Testing', () => {
  // Headless Chrome specifically supports CPU throttling via CDP interfaces.
  // Other browsers do not support CDPSession and CPU throttling rates, so we skip them.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-only test due to CDP CPU throttling');

  const slowdownRates = [4, 6];

  for (const rate of slowdownRates) {
    test(`styling switches with ${rate}x CPU slowdown model`, async ({ page, perfMonitor }) => {
      // Connect to Chrome DevTools Protocol to enable CPU throttling
      await perfMonitor.setupCpuThrottling(rate);

      // Register the PerformanceObserver on the window object
      await perfMonitor.startMonitoring();

      // Navigate to the homepage
      await page.goto('/');

      // Wait for the app to hydrate successfully
      await page.waitForSelector('main[data-hydrated="true"]');

      // Set a known value for the QR code to ensure reliable canvas rendering
      const urlInput = page.locator('#url-input');
      await urlInput.waitFor({ state: 'visible' });
      await urlInput.fill('https://qr.cr');
      await page.waitForSelector('canvas[role="img"]');

      // Clear any long tasks registered during the initial page load/hydration phase.
      await perfMonitor.clearLongTasks();

      // List of complex visual style patterns to test (Grunge, Starburst, and Circuit)
      const stylesToTest = [
        { label: 'Cyber Circuit', ariaLabel: 'Select Cyber Circuit pattern' },
        { label: 'Grunge', ariaLabel: 'Select Grunge pattern' },
        { label: 'Starburst', ariaLabel: 'Select Starburst pattern' },
      ];

      // Interactive performance check for each preset style configuration
      for (const style of stylesToTest) {
        // Clear long task list before beginning transition
        await perfMonitor.clearLongTasks();

        // Click the corresponding pattern style button using a force-click
        const styleButton = page.getByLabel(style.ariaLabel);
        await styleButton.click({ force: true });

        // Wait to allow all layout computation, canvas drawing, and async queues to settle
        await page.waitForTimeout(1000);

        // Fetch captured main-thread long tasks from the window observer
        const longTasks = await perfMonitor.getLongTasks();

        // Log the measured main-thread execution blocks
        console.log(`[Rate ${rate}x] Style transition to "${style.label}" long tasks:`, longTasks);

        // Hardware-Agnostic Performance Budgets:
        // Adjust the base thresholds (60ms for 4x, 150ms for 6x) by the dynamic host calibration scale factor
        const baseThreshold = rate === 4 ? 60 : 150;
        const scaleFactor = perfMonitor.getHardwareScaleFactor();
        const threshold = baseThreshold * scaleFactor;

        for (const task of longTasks) {
          expect(task.duration).toBeLessThanOrEqual(
            threshold,
            `Main-thread long task duration (${task.duration.toFixed(1)}ms) exceeded the calibrated budget (${threshold.toFixed(1)}ms) during transition to "${style.label}" under ${rate}x CPU slowdown.`
          );
        }
      }
    });

    test(`tab switches and text input with ${rate}x CPU slowdown model`, async ({ page, perfMonitor }) => {
      // Connect to Chrome DevTools Protocol to enable CPU throttling
      await perfMonitor.setupCpuThrottling(rate);

      // Register the PerformanceObserver on the window object
      await perfMonitor.startMonitoring();

      // Navigate to the homepage
      await page.goto('/');

      // Wait for the app to hydrate successfully
      await page.waitForSelector('main[data-hydrated="true"]');

      // Clear any long tasks registered during the initial page load/hydration phase.
      await perfMonitor.clearLongTasks();

      // Switch to 'Location' tab
      const locationTab = page.getByRole('tab', { name: 'Location' });
      await locationTab.click();
      await page.getByTestId('use-current-location').waitFor({ state: 'visible' });

      // Switch to 'Email' tab
      const emailTab = page.getByRole('tab', { name: 'Email' });
      await emailTab.click();
      await page.locator('#email-address').waitFor({ state: 'visible' });

      // Enter some email text
      await page.locator('#email-address').fill('hello@example.com');

      // Wait to allow all layout computation, canvas drawing, and async queues to settle
      await page.waitForTimeout(1000);

      // Fetch captured main-thread long tasks from the window observer
      const longTasks = await perfMonitor.getLongTasks();

      // Log the measured main-thread execution blocks
      console.log(`[Rate ${rate}x] Tab switches and email input long tasks:`, longTasks);

      // Hardware-Agnostic Performance Budgets:
      // Adjust the base thresholds (60ms for 4x, 150ms for 6x) by the dynamic host calibration scale factor
      const baseThreshold = rate === 4 ? 60 : 150;
      const scaleFactor = perfMonitor.getHardwareScaleFactor();
      const threshold = baseThreshold * scaleFactor;

      for (const task of longTasks) {
        expect(task.duration).toBeLessThanOrEqual(
          threshold,
          `Main-thread long task duration (${task.duration.toFixed(1)}ms) exceeded the calibrated budget (${threshold.toFixed(1)}ms) during tab switches and inputs under ${rate}x CPU slowdown.`
        );
      }
    });
  }
});
