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
import type { Page } from '@playwright/test';

/** Every prerendered route, plus an unknown path for the 404 page. */
const ROUTES = [
  '/',
  '/text-qr-code',
  '/wifi-qr-code',
  '/vcard-qr-code',
  '/email-qr-code',
  '/phone-qr-code',
  '/sms-qr-code',
  '/payment-qr-code',
  '/event-qr-code',
  '/location-qr-code',
  '/meeting-qr-code',
  '/social-qr-code',
  '/about',
  '/security',
  '/file-transfer',
  '/file-transfer/receive',
  '/dynamic-dashboard',
  '/arcade',
  '/this-page-does-not-exist',
];

/** Common phone viewports: iPhone SE, iPhone 12-15, Android (Pixel 7 class), small Android. */
const PHONE_VIEWPORTS = [
  { name: 'iOS Safari 375x667', width: 375, height: 667 },
  { name: 'iOS Safari 390x844', width: 390, height: 844 },
  { name: 'Android Chrome 412x915', width: 412, height: 915 },
  { name: 'Small Android 320x568', width: 320, height: 568 },
];

async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('main[data-hydrated="true"]');
}

/** Elements inside the tool workspace that scroll on their own (nested scroll areas). */
async function nestedScrollers(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const workspace = document.querySelector('[data-testid="tool-workspace"]');
    if (!workspace) return ['missing tool workspace'];
    const offenders: string[] = [];
    for (const el of [workspace, ...Array.from(workspace.querySelectorAll<HTMLElement>('*'))]) {
      const style = getComputedStyle(el);
      const scrollsY = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
      if (scrollsY) offenders.push(`${el.tagName.toLowerCase()}.${Array.from(el.classList).slice(0, 4).join('.')}`);
    }
    return offenders;
  });
}

test.describe('No horizontal page overflow at 390px (#978)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route} fits the viewport width`, async ({ page }) => {
      await gotoHydrated(page, route);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `${route} scrollWidth`).toBeLessThanOrEqual(innerWidth);
    });
  }

});

test.describe('Content-first mobile generator (#795)', () => {
  for (const viewport of [PHONE_VIEWPORTS[3], PHONE_VIEWPORTS[1]]) {
    test(`content field is in the first viewport at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoHydrated(page, '/');

      const input = page.locator('#url-input');
      const inputBox = await input.boundingBox();
      const previewBox = await page.getByRole('region', { name: 'QR Code Preview' }).boundingBox();
      expect(inputBox).not.toBeNull();
      expect(previewBox).not.toBeNull();
      expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(viewport.height);
      expect(inputBox!.y).toBeLessThan(previewBox!.y);

      // Preview and download stay one tap away.
      await page.getByRole('link', { name: 'Preview & download' }).click();
      await expect(page.getByRole('button', { name: 'Download QR code as PNG' })).toBeInViewport();
    });
  }

  test('the document is the only vertical scroll surface and wheel over the preview scrolls it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHydrated(page, '/');
    expect(await nestedScrollers(page)).toEqual([]);

    const preview = page.getByRole('region', { name: 'QR Code Preview' });
    await preview.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    const box = await preview.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, Math.min(box!.y + 40, 800));
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });

  test('preview scroll position is cleared when resizing from desktop to mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await gotoHydrated(page, '/');
    const scroller = page.getByTestId('tool-workspace-preview-scroller');
    await scroller.evaluate((el) => { el.scrollTop = 200; });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
    expect(await scroller.evaluate((el) => getComputedStyle(el).overflowY)).toBe('visible');
  });

  test('desktop keeps the sticky preview beside the controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoHydrated(page, '/');
    const scroller = page.getByTestId('tool-workspace-preview-scroller');
    expect(await scroller.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    const settings = await page.getByRole('complementary', { name: 'QR Code Settings' }).boundingBox();
    const preview = await page.getByRole('region', { name: 'QR Code Preview' }).boundingBox();
    expect(preview!.x).toBeGreaterThanOrEqual(settings!.x + settings!.width - 1);
  });
});

test.describe('File transfer workspaces on phones (#796)', () => {
  for (const viewport of PHONE_VIEWPORTS) {
    test(`sender and receiver have one scroll surface at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await gotoHydrated(page, '/file-transfer');
      expect(await nestedScrollers(page)).toEqual([]);
      const start = await page.getByRole('button', { name: 'Start file transfer' }).boundingBox();
      const canvas = await page.getByRole('img', { name: 'Transfer QR code' }).boundingBox();
      expect(start!.y).toBeLessThan(canvas!.y);

      await gotoHydrated(page, '/file-transfer/receive');
      expect(await nestedScrollers(page)).toEqual([]);
      const activate = page.getByRole('button', { name: 'Activate camera scanner' });
      await expect(activate).toBeInViewport();
      const viewportBox = await page.getByRole('region', { name: 'Camera Capture Viewport' }).boundingBox();
      const activateBox = await activate.boundingBox();
      expect(activateBox!.y).toBeLessThan(viewportBox!.y);
    });
  }

  test('Send and Receive are reachable from each other on mobile via transfer mode switcher', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHydrated(page, '/file-transfer');
    await page.getByRole('navigation', { name: 'Transfer mode' }).getByRole('link', { name: /Receive File/ }).click();
    await expect(page).toHaveURL(/\/file-transfer\/receive\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Receive a File by QR Code' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Transfer mode' }).getByRole('link', { name: /Send File/ }).click();
    await expect(page).toHaveURL(/\/file-transfer\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Send a File by QR Code' })).toBeVisible();
  });
});
