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
import { ROUTES, gotoHydrated } from './utils/routes';

/** Readability budget (#1057): 12px is the floor, and most text on the generator is 14px or more. */
const MIN_FONT_PX = 12;
const BODY_FONT_PX = 14;
const MIN_BODY_SHARE = 0.7;
/** WCAG 2.2 SC 2.5.8 Target Size (Minimum). */
const MIN_TARGET_PX = 24;

interface TextReport {
  total: number;
  atLeastBody: number;
  belowFloor: string[];
}

/**
 * Measures every rendered, visible text node: its computed font size and whether it is at
 * least the body size. Screen-reader-only text (clipped to 1px) is skipped.
 * @param page - The page.
 * @param bodyPx - Body text size in px.
 * @param floorPx - Smallest allowed size in px.
 * @returns Counts and the text below the floor.
 */
async function measureText(page: Page, bodyPx: number, floorPx: number): Promise<TextReport> {
  return page.evaluate(
    ({ bodyPx, floorPx }) => {
      const report = { total: 0, atLeastBody: 0, belowFloor: [] as string[] };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent?.trim();
        const el = node.parentElement;
        if (!text || !el || el.closest('script, style, noscript, template, svg')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (!Array.from(range.getClientRects()).some((r) => r.width > 0 && r.height > 0)) continue;
        const box = el.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) continue;
        const style = getComputedStyle(el);
        if (style.visibility !== 'visible' || el.closest('[aria-hidden="true"][hidden], [hidden]')) continue;
        const size = parseFloat(style.fontSize);
        report.total++;
        if (size >= bodyPx) report.atLeastBody++;
        if (size < floorPx) report.belowFloor.push(`${size}px: ${text.slice(0, 40)}`);
      }
      return report;
    },
    { bodyPx, floorPx }
  );
}

/**
 * Lists visible interactive controls smaller than the minimum target in either dimension.
 * Inline links inside running text are exempt (WCAG 2.5.8 inline exception), as are
 * visually hidden native inputs whose visible label is the target.
 * @param page - The page.
 * @param minPx - Minimum target size in CSS px.
 * @returns Descriptions of the undersized controls.
 */
async function undersizedTargets(page: Page, minPx: number): Promise<string[]> {
  return page.evaluate((minPx) => {
    const selector =
      'a[href], button, select, textarea, input:not([type="hidden"]), [role="button"], [role="radio"], [role="tab"], [role="switch"], [role="menuitem"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible' || style.display === 'none' || el.closest('[inert], [hidden]')) continue;
      let box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue; // visually hidden (sr-only) control
      // A checkbox or radio inside its label: the whole label is the target.
      const label = el instanceof HTMLInputElement ? el.closest('label') : null;
      if (label) box = label.getBoundingClientRect();
      if (el.tagName === 'A' && style.display === 'inline') continue; // link in a sentence
      // A range input's target is its thumb, which spans the full input height and is sized by the browser.
      if (el instanceof HTMLInputElement && el.type === 'range') continue;
      if (box.width < minPx - 0.5 || box.height < minPx - 0.5) {
        const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
        offenders.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    return offenders;
  }, minPx);
}

test.describe('Readability and target size (#1057)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test(`most text on / is at least ${BODY_FONT_PX}px`, async ({ page }) => {
    await gotoHydrated(page, '/');
    // Measure with the lazily loaded appearance controls in place, not their loading skeleton.
    await expect(page.getByRole('button', { name: 'Pattern & Colors' })).toBeVisible();
    const report = await measureText(page, BODY_FONT_PX, MIN_FONT_PX);
    const share = report.atLeastBody / report.total;
    console.log(`[readability] / ${report.atLeastBody}/${report.total} text nodes >= ${BODY_FONT_PX}px (${(share * 100).toFixed(1)}%)`);
    expect(share).toBeGreaterThanOrEqual(MIN_BODY_SHARE);
  });

  for (const route of ROUTES) {
    test(`${route} has no text below ${MIN_FONT_PX}px and no target below ${MIN_TARGET_PX}px`, async ({ page }) => {
      await gotoHydrated(page, route);
      await page.waitForLoadState('networkidle'); // lazily loaded panels are part of the page
      const report = await measureText(page, BODY_FONT_PX, MIN_FONT_PX);
      expect(report.belowFloor).toEqual([]);
      expect(await undersizedTargets(page, MIN_TARGET_PX)).toEqual([]);
    });
  }
});
