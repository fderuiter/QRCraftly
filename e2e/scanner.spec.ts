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

/**
 * The generator's camera scanner against a scripted fake camera (#1103).
 *
 * The fake camera (`tests/utils/fakeCamera.ts`) feeds a canvas stream into the real
 * scanner (engine, worker, jsQR), so these tests measure what a user waits for: the
 * time from opening the scanner (or a code appearing) to the decoded code landing in
 * the generator. Budgets are generous so they do not flake on a CI runner; the
 * numbers are attached to each test as `time-to-decode` annotations.
 */
import { setTimeout as delay } from 'node:timers/promises';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';
import { codeScene, installFakeCamera, liveCameraTracks, showOnCamera } from '../tests/utils/fakeCamera';

const CODE = 'https://qrcraftly.com/scanned';
const SUCCESS_TOAST = 'Successfully scanned QR code';
/** PR CI budget for decoding a code that is in view when the scanner opens (#1103). */
const BASELINE_BUDGET_MS = 1000;
/** PR CI budget for a scanner reopened after a long session with no code (#1095, #1103). */
const REOPEN_BUDGET_MS = 2000;
/** How long the scanner looks at nothing before it is closed and reopened. */
const LONG_SESSION_MS = 20_000;

declare global {
  interface Window {
    __decode?: { startedAt: number; decodedAt: number | null };
  }
}

/** Starts the clock and watches for the next "scanned" toast. */
async function startDecodeTimer(page: Page): Promise<void> {
  await page.evaluate((text) => {
    const timer = { startedAt: performance.now(), decodedAt: null as number | null };
    window.__decode = timer;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.textContent?.includes(text)) {
            timer.decodedAt = performance.now();
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }, SUCCESS_TOAST);
}

/** Waits for the decode the timer is watching and returns the elapsed milliseconds. */
async function decodeTime(page: Page, timeout = 15_000): Promise<number> {
  await expect.poll(() => page.evaluate(() => window.__decode?.decodedAt != null), { timeout, intervals: [50] }).toBe(true);
  return page.evaluate(() => {
    const timer = window.__decode;
    return timer && timer.decodedAt !== null ? Math.round(timer.decodedAt - timer.startedAt) : Number.NaN;
  });
}

/**
 * Resources the page fetched between the timer's start and the decode (resource timing), other
 * than the app's own code: applying the decoded content starts the generator's matrix worker,
 * whose script is a same-origin `/assets/` file, exactly as typing the same content would.
 */
async function requestsDuringScan(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const timer = window.__decode;
    if (!timer || timer.decodedAt === null) return ['<no decode>'];
    const { startedAt, decodedAt } = timer;
    return performance
      .getEntriesByType('resource')
      .filter((entry) => entry.startTime >= startedAt && entry.startTime <= decodedAt)
      .map((entry) => entry.name)
      .filter((name) => !/^https?:\/\/[^/]+\/assets\/[\w.-]+\.js$/.test(name) || !name.startsWith(location.origin));
  });
}

function report(testInfo: TestInfo, scenario: string, ms: number): void {
  testInfo.annotations.push({ type: 'time-to-decode', description: `${scenario}: ${ms} ms` });
  console.log(`[scanner] ${testInfo.project.name} ${scenario}: ${ms} ms`);
}

async function openGenerator(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('main[data-hydrated="true"]');
  // Let the generator finish its first render and route prefetching, as a user would.
  await page.waitForLoadState('networkidle');
}

const openScanner = (page: Page) => page.getByRole('button', { name: 'Scan QR Code' }).click();

/** Opens the scanner with `scene` in view and returns the time to decode. */
async function scanWith(page: Page, scene: Parameters<typeof codeScene>[1] = {}): Promise<number> {
  await showOnCamera(page, codeScene(CODE, scene));
  await startDecodeTimer(page);
  await openScanner(page);
  const ms = await decodeTime(page);
  await expect(page.locator('#url-input')).toHaveValue(CODE);
  return ms;
}

test.describe('Camera scanner with a scripted fake camera', () => {
  test.describe('Chromium', () => {
    // The fake camera's canvas stream and CPU throttling (CDP) are Chromium features in CI.
    test.skip(({ browserName }) => browserName !== 'chromium', 'scripted fake camera runs in Chromium');

    test('decodes a code in view, sends nothing over the network and releases the camera', async ({ page, context }, testInfo) => {
      await installFakeCamera(context);
      await openGenerator(page);

      const baseline = await scanWith(page);
      report(testInfo, 'baseline', baseline);
      expect(baseline).toBeLessThan(BASELINE_BUDGET_MS);
      // A successful scan closes the scanner and stops the camera.
      await expect.poll(() => liveCameraTracks(page)).toBe(0);

      // Nothing goes over the network between opening the scanner and the decode, and nothing the
      // page requests afterwards (its own code, the service worker's precache) carries the payload.
      await page.locator('#url-input').fill('https://example.com/');
      const requests: string[] = [];
      context.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));
      const again = await scanWith(page);
      report(testInfo, 'second scan', again);
      expect(await requestsDuringScan(page)).toEqual([]);
      for (const request of requests) {
        expect(request).toMatch(/^GET http:\/\/127\.0\.0\.1:3000\//);
        expect(request).not.toContain('scanned');
      }

      // Closing the scanner without a code releases the camera too.
      await showOnCamera(page, null);
      await openScanner(page);
      await expect.poll(() => liveCameraTracks(page)).toBe(1);
      await page.getByRole('button', { name: 'Close scanner' }).click();
      await expect.poll(() => liveCameraTracks(page)).toBe(0);
    });

    test('decodes at once when reopened after a long session with no code', async ({ page, context }, testInfo) => {
      await installFakeCamera(context);
      await openGenerator(page);
      const baseline = await scanWith(page);
      report(testInfo, 'baseline', baseline);

      // The shared worker served a long session with no code (#1095): the next one must not wait.
      await page.locator('#url-input').fill('https://example.com/');
      await showOnCamera(page, null);
      await openScanner(page);
      await delay(LONG_SESSION_MS);
      await page.getByRole('button', { name: 'Close scanner' }).click();

      const reopened = await scanWith(page);
      report(testInfo, `reopened after ${LONG_SESSION_MS / 1000} s with no code`, reopened);
      expect(reopened).toBeLessThan(REOPEN_BUDGET_MS);
      expect(reopened).toBeLessThan(Math.max(2 * baseline, BASELINE_BUDGET_MS));
    });

    test('decodes small modules and inverted codes', async ({ page, context }, testInfo) => {
      await installFakeCamera(context);
      await openGenerator(page);

      const small = await scanWith(page, { modulePx: 2 });
      report(testInfo, 'small modules (2 px)', small);
      expect(small).toBeLessThan(3000);

      await page.locator('#url-input').fill('https://example.com/');
      const inverted = await scanWith(page, { invert: true });
      report(testInfo, 'inverted', inverted);
      expect(inverted).toBeLessThan(3000);
    });
  });
});
