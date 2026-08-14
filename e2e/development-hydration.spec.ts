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

test('development client hydrates and updates the QR preview', async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page.locator('main[data-hydrated="true"]')).toBeVisible();

  const urlInput = page.locator('#url-input');
  const preview = page.getByRole('img', { name: /QR Code for Url/i });
  await expect(urlInput).toBeEditable();
  await expect(preview).toBeVisible();

  const initialPreview = await preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());

  await urlInput.fill('https://example.com/development-hydration');
  await expect(urlInput).toHaveValue('https://example.com/development-hydration');
  await expect.poll(
    () => preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
    { message: 'QR preview did not update after editing the URL' },
  ).not.toBe(initialPreview);

  expect(runtimeErrors).toEqual([]);
});
