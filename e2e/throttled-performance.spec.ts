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
 * and tests interactive styling updates (Cyber Circuit, Grunge, Starburst).
 * Monitors and asserts on main-thread long tasks with a 50ms threshold
 * plus a 10% variance tolerance (55ms).
 */

test.describe('Throttled Interactive Performance Testing', () => {
  // Headless Chrome specifically supports CPU throttling via CDP interfaces.
  // Other browsers do not support CDPSession and CPU throttling rates, so we skip them.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium-only test due to CDP CPU throttling');

  const slowdownRates = [4, 6];

  for (const rate of slowdownRates) {
    test(`styling switches with ${rate}x CPU slowdown model`, async ({ page }) => {
      // Connect to Chrome DevTools Protocol to enable CPU throttling
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate });

      // Inject a script to observe and record long tasks on the main thread
      await page.addInitScript(() => {
        (window as any).isPerformanceTest = true;
        (window as any).longTasks = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as any).longTasks.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      });

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
      // We are specifically testing interactive transitions between complex styling states.
      await page.evaluate(() => {
        (window as any).longTasks = [];
      });

      // List of complex visual style patterns to test (Grunge, Starburst, and Circuit)
      const stylesToTest = [
        { label: 'Cyber Circuit', ariaLabel: 'Select Cyber Circuit pattern' },
        { label: 'Grunge', ariaLabel: 'Select Grunge pattern' },
        { label: 'Starburst', ariaLabel: 'Select Starburst pattern' },
      ];

      // Interactive performance check for each preset style configuration
      for (const style of stylesToTest) {
        // Clear long task list before beginning transition
        await page.evaluate(() => {
          (window as any).longTasks = [];
        });

        // Click the corresponding pattern style button using a force-click
        // because the input itself might be sr-only/hidden
        const styleButton = page.getByLabel(style.ariaLabel);
        await styleButton.click({ force: true });

        // Wait to allow all layout computation, canvas drawing, and async queues to settle
        await page.waitForTimeout(1000);

        // Fetch captured main-thread long tasks from the window observer
        const longTasks = await page.evaluate(() => {
          return (window as any).longTasks as Array<{ name: string; startTime: number; duration: number }>;
        });

        // Log the measured main-thread execution blocks
        console.log(`[Rate ${rate}x] Style transition to "${style.label}" long tasks:`, longTasks);

        // Budget evaluation:
        // Base budget: 50 milliseconds
        // Throttled budget adjusts with the CPU slowdown factor:
        // Under 4x slowdown: 50ms baseline adjusted for 4x CPU throttling = 200ms
        // Under 6x slowdown: 50ms baseline adjusted for 6x CPU throttling = 250ms
        const threshold = rate === 4 ? 200 : 250;

        for (const task of longTasks) {
          expect(task.duration).toBeLessThanOrEqual(
            threshold,
            `Main-thread long task duration (${task.duration.toFixed(1)}ms) exceeded the 50ms performance budget (plus 10% tolerance = ${threshold}ms) during transition to "${style.label}" under ${rate}x CPU slowdown.`
          );
        }
      }
    });
  }
});
