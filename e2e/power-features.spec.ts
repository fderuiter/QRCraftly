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

async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('main[data-hydrated="true"]');
}

test.describe('Generator power features (#1059, #1061)', () => {
  test('the command palette applies a pattern from the keyboard and Ctrl+Z undoes it', async ({ page }) => {
    await gotoHydrated(page, '/');

    await page.keyboard.press('Control+k');
    const search = page.getByRole('combobox', { name: 'Type a command' });
    await expect(search).toBeFocused();
    expect(await page.getByRole('option').count()).toBeGreaterThanOrEqual(25);

    await search.fill('swiss');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Select Swiss Dot pattern' })).toBeChecked();

    await page.keyboard.press('Control+z');
    await expect(page.getByRole('radio', { name: 'Select Standard Industrial pattern' })).toBeChecked();
  });

  test('the style gallery draws the visitor\'s QR in each look and applies one with a click', async ({ page }) => {
    await gotoHydrated(page, '/');
    await page.getByRole('button', { name: 'Style Gallery' }).click();
    const patterns = page.getByRole('radiogroup', { name: 'Patterns' });
    await expect(patterns.locator('img')).toHaveCount(8);

    await patterns.getByRole('radio', { name: /Modern Soft pattern/ }).click();
    await expect(page.getByRole('radio', { name: 'Select Modern Soft pattern' })).toBeChecked();
    await page.getByRole('button', { name: 'Undo style change' }).click();
    await expect(page.getByRole('radio', { name: 'Select Standard Industrial pattern' })).toBeChecked();
  });

  test('the cheat sheet opens with ? and leaves text fields alone', async ({ page }) => {
    await gotoHydrated(page, '/');
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
