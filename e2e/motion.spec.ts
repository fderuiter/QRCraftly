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

/*
 * Motion (#1054): overlays animate in and out with the motion tokens, the QR preview
 * crossfades and type switches use a view transition, and all of it is instant when the
 * user asks for reduced motion.
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { gotoHydrated } from './utils/routes';

/** Counts view transitions and crossfade ghost canvases started after this call. */
async function instrumentMotion(page: Page) {
  await page.addInitScript(() => {
    const counters = { viewTransitions: 0, ghosts: 0 };
    Object.defineProperty(window, '__motion', { value: counters });
    const original = document.startViewTransition;
    if (typeof original === 'function') {
      document.startViewTransition = function (...args: Parameters<typeof original>) {
        counters.viewTransitions += 1;
        return original.apply(document, args);
      };
    }
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLCanvasElement && node.getAttribute('aria-hidden') === 'true') counters.ghosts += 1;
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

function motionCounters(page: Page) {
  return page.evaluate(() => {
    const value: unknown = Reflect.get(window, '__motion');
    if (typeof value !== 'object' || value === null) return { viewTransitions: -1, ghosts: -1 };
    return {
      viewTransitions: Number(Reflect.get(value, 'viewTransitions')),
      ghosts: Number(Reflect.get(value, 'ghosts')),
    };
  });
}

/** Opens the site menu dialog at phone width, where the primary navigation collapses into it. */
async function openSiteMenu(page: Page) {
  await page.setViewportSize({ width: 320, height: 640 });
  await gotoHydrated(page, '/about');
  await page.getByRole('button', { name: 'Site menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Opens the Pattern & Colors accordion section, collapsing it first when it starts open. */
async function expandPatternSection(page: Page) {
  const section = page.getByRole('button', { name: 'Pattern & Colors' });
  if ((await section.getAttribute('aria-expanded')) === 'true') await section.click();
  await expect(section).toHaveAttribute('aria-expanded', 'false');
  await section.click();
  await expect(section).toHaveAttribute('aria-expanded', 'true');
}

/** Counts mounted dialogs right now, without waiting. */
function dialogCount(page: Page) {
  return page.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
}

/** Longest transition duration of an element, in ms. */
function longestTransitionMs(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) =>
    Math.max(...getComputedStyle(el).transitionDuration.split(',').map((part) => parseFloat(part) * 1000)),
  );
}

test.describe('Reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the site menu dialog opens and closes without animating', async ({ page }) => {
    const dialog = await openSiteMenu(page);
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');

    await page.keyboard.press('Escape');
    // No exit animation: the dialog is gone as soon as the key is handled.
    expect(await dialogCount(page)).toBe(0);
  });

  test('accordion panels and the download options change instantly', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expandPatternSection(page);
    expect(await longestTransitionMs(page, '.disclosure-panel:not([hidden])')).toBeLessThan(1);

    await page.getByRole('button', { name: 'Download options' }).click();
    const options = page.getByRole('group', { name: 'Download options' });
    await expect(options).toBeVisible();
    expect(await options.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
  });

  test('type switches and preview updates do not animate', async ({ page }) => {
    await instrumentMotion(page);
    await gotoHydrated(page, '/');
    await page.locator('#url-input').fill('https://example.com/reduced');
    await page.getByRole('navigation', { name: 'QR code types' }).getByRole('link', { name: 'Text', exact: true }).click();
    await expect(page).toHaveURL(/\/text-qr-code$/);
    await page.waitForSelector('main[data-hydrated="true"]');
    expect(await motionCounters(page)).toEqual({ viewTransitions: 0, ghosts: 0 });
  });
});

test.describe('Motion allowed', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('the site menu dialog pops in and plays its exit before unmounting', async ({ page }) => {
    const dialog = await openSiteMenu(page);
    expect(await dialog.evaluate((el) => getComputedStyle(el).animationName)).toBe('pop-in');

    await page.keyboard.press('Escape');
    const state = await page.evaluate(() => {
      const backdrop = document.querySelector('[role="dialog"]')?.parentElement;
      return { closing: backdrop?.hasAttribute('data-closed') ?? false, inert: backdrop?.hasAttribute('inert') ?? false };
    });
    expect(state).toEqual({ closing: true, inert: true });
    await expect(dialog).toHaveCount(0);
  });

  test('accordion panels animate their height with the base duration', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expandPatternSection(page);
    expect(await longestTransitionMs(page, '.disclosure-panel:not([hidden])')).toBe(200);
  });

  test('the QR preview crossfades without holding back the new frame', async ({ page }) => {
    await instrumentMotion(page);
    await gotoHydrated(page, '/');
    await page.locator('#url-input').fill('https://example.com/crossfade');
    await expect.poll(async () => (await motionCounters(page)).ghosts).toBeGreaterThan(0);
    // The ghost is an overlay that fades out and is removed; the live canvas is never hidden.
    await expect(page.locator('canvas[aria-hidden="true"]')).toHaveCount(0, { timeout: 2000 });
  });

  test('switching QR type uses a view transition where the browser supports it', async ({ page }) => {
    await instrumentMotion(page);
    await gotoHydrated(page, '/');
    const supported = await page.evaluate(() => typeof document.startViewTransition === 'function');
    await page.getByRole('navigation', { name: 'QR code types' }).getByRole('link', { name: 'Text', exact: true }).click();
    await expect(page).toHaveURL(/\/text-qr-code$/);
    await page.waitForSelector('main[data-hydrated="true"]');
    expect((await motionCounters(page)).viewTransitions).toBe(supported ? 1 : 0);
  });
});
