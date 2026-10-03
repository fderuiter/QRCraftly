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

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { codeScene, installFakeCamera, liveCameraTracks, requestedCameraConstraints, showOnCamera } from '../tests/utils/fakeCamera';
import { renderPhoto } from '../tests/utils/photoFixture';

/**
 * The standalone scanner page and the scanner's image paths (#1034, #1101): the camera starts
 * only on request, a screenshot pastes from the clipboard, a result opens in the generator
 * without touching the URL, and nothing goes over the network while a code is scanned.
 */

const CODE = 'https://qrcraftly.com/from-the-scanner-page';

async function openScannerPage(page: Page): Promise<void> {
  await page.goto('/qr-code-scanner');
  await page.waitForSelector('main[data-hydrated="true"]');
  await page.waitForLoadState('networkidle');
}

/** Puts a PNG screenshot of a QR code for `text` on the clipboard (async clipboard API). */
async function copyScreenshotToClipboard(page: Page, text: string): Promise<void> {
  const jpeg = await renderPhoto(page, text, { width: 800, height: 600, modulePx: 8 });
  await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('PNG encoding failed');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  }, jpeg.toString('base64'));
}

test.describe('QR code scanner page', () => {
  test('asks for the camera only on request and opens a result in the generator without the URL', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'canvas-stream fake camera does not stream in WebKit');
    await installFakeCamera(context);
    await openScannerPage(page);
    await expect(page.getByRole('heading', { level: 1, name: 'QR Code Scanner' })).toBeVisible();
    expect(await requestedCameraConstraints(page)).toEqual([]);

    await showOnCamera(page, codeScene(CODE));
    await page.getByRole('button', { name: 'Start camera' }).click();
    await expect(page.getByTestId('scan-result-host')).toHaveText('qrcraftly.com', { timeout: 15_000 });
    await expect.poll(() => liveCameraTracks(page)).toBe(0);

    await page.getByRole('button', { name: 'Open in generator' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(page.url()).not.toContain('from-the-scanner-page');
    await expect(page.locator('#url-input')).toHaveValue(CODE);
  });
});

test.describe('Scanning a pasted screenshot', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'clipboard image permissions are a Chromium feature in CI');

  test('decodes a screenshot from the clipboard with zero network requests once loaded', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openScannerPage(page);
    await page.getByRole('radio', { name: 'Image' }).click();

    // The first scan loads the scanner's own reader code (same-origin /assets files, ADR 0023).
    await copyScreenshotToClipboard(page, CODE);
    await page.getByRole('button', { name: 'Paste image' }).click();
    await expect(page.getByTestId('scan-result-host')).toHaveText('qrcraftly.com', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Scan another' }).click();
    // Let the offline service worker finish precaching the site, which it does in the background.
    await page.evaluate(async () => {
      await navigator.serviceWorker?.ready;
    });
    await page.waitForLoadState('networkidle');

    // From opening the image input to showing the result sheet, nothing goes over the network.
    const second = `${CODE}/again`;
    await copyScreenshotToClipboard(page, second);
    const requests: string[] = [];
    context.on('request', (request) => requests.push(request.url()));
    await page.getByRole('button', { name: 'Paste image' }).click();
    await expect(page.getByTestId('scan-result')).toContainText(second, { timeout: 15_000 });
    expect(requests).toEqual([]);
  });

  test('blocks a script link and offers Copy only', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openScannerPage(page);
    await page.getByRole('radio', { name: 'Image' }).click();
    await copyScreenshotToClipboard(page, 'javascript:alert(document.domain)');
    await page.getByRole('button', { name: 'Paste image' }).click();
    await expect(page.getByRole('heading', { name: 'Blocked QR code' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open link' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open in generator' })).toHaveCount(0);
  });
});
