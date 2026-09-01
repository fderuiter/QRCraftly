/*
    QRCraftly
    Copyright (C) 2025 fderuiter

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

test.describe('Focus Management & Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
  });

  test('Tab sequences cycle correctly within the dialog panel (focus trap)', async ({ page }) => {
    // Wait for the lazy-loaded Color controls to be rendered and visible
    const fgTextInput = page.locator('input[aria-label="Foreground Hex Code"]');
    await fgTextInput.waitFor({ state: 'visible' });

    // 1. Trigger the Scan Safety Warning Modal by setting low contrast colors via native input prototype setter
    await page.locator('#fg-color').evaluate((el: any) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, '#e0e0e0');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.locator('#bg-color').evaluate((el: any) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, '#ffffff');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Wait for the low contrast warning message to be visible
    const warningAlert = page.getByText(/The contrast ratio is low/i).first();
    await expect(warningAlert).toBeVisible();

    // Opening the format menu is never gated, even for an unsafe QR.
    const downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    await downloadBtn.click();
    await expect(page.getByText('PNG (High Quality)')).toBeVisible();
    await expect(page.getByText('Scan Safety Warning')).not.toBeVisible();

    // Choosing a concrete format triggers the safety gate Modal.
    await page.getByText('PNG (High Quality)').click();

    // The modal should appear
    const modalTitle = page.getByText('Scan Safety Warning');
    await expect(modalTitle).toBeVisible();

    // The first focusable element (Close button 'Close modal') should be focused automatically
    const closeBtn = page.getByRole('button', { name: 'Close modal' });
    await expect(closeBtn).toBeFocused();

    // 2. Tab key sequence navigation cycles through the modal elements
    // Tab -> Go Back button
    await page.keyboard.press('Tab');
    const goBackBtn = page.getByRole('button', { name: 'Go Back' });
    await expect(goBackBtn).toBeFocused();

    // Tab -> Export Anyway button
    await page.keyboard.press('Tab');
    const exportAnywayBtn = page.getByRole('button', { name: 'Export Anyway' });
    await expect(exportAnywayBtn).toBeFocused();

    // Tab again -> Cycles back to Close button
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();

    // Shift+Tab -> Cycles backward to Export Anyway button
    // Using down('Shift') + press('Tab') + up('Shift') for flawless cross-browser compatibility
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await expect(exportAnywayBtn).toBeFocused();

    // Close the modal to cleanly exit
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });

  test('Keyboard focus transitions cleanly when switching input panels', async ({ page }) => {
    // Focus the initial 'URL' tab
    const urlTab = page.getByRole('tab', { name: 'URL' });
    await urlTab.focus();
    await expect(urlTab).toBeFocused();

    // Press ArrowRight to move to the 'Text' tab and programmatically switch
    await page.keyboard.press('ArrowRight');
    const textTab = page.getByRole('tab', { name: 'Text' });
    await expect(textTab).toBeFocused();

    // Wait for the Text panel's input field to be rendered in the DOM and visible
    const textInput = page.locator('#text-content');
    await textInput.waitFor({ state: 'visible' });

    // Press Tab to shift focus directly to the associated panel contents (Text input textarea)
    await page.keyboard.press('Tab');
    await expect(textInput).toBeFocused();
  });

  test('Screen readers receive immediate change notifications during component state updates', async ({ page }) => {
    const liveRegion = page.locator('[role="status"]').first();
    
    // Switch to WiFi tab
    await page.getByRole('tab', { name: 'WiFi' }).click();
    await expect(liveRegion).toHaveText('WiFi input loaded');

    // Switch to Email tab
    await page.getByRole('tab', { name: 'Email' }).click();
    await expect(liveRegion).toHaveText('Email input loaded');
  });
});
