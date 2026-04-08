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

import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for the "Use Current Location" geolocation feature
 * on the Location QR type input.
 */

// Navigate to the homepage and activate the Location QR type before each test.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for all network requests to settle so React has fully hydrated
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Location' }).click();
  // Wait for the form to be fully rendered
  await page.getByRole('button', { name: /use current location/i }).waitFor({ state: 'visible' });
});

test.describe('Location QR type', () => {
  test('renders Latitude and Longitude fields and the Use Current Location button', async ({ page }) => {
    await expect(page.getByLabel('Latitude')).toBeVisible();
    await expect(page.getByLabel('Longitude')).toBeVisible();
    await expect(page.getByRole('button', { name: /use current location/i })).toBeVisible();
  });

  test('manually entering coordinates generates a QR code', async ({ page }) => {
    await page.getByLabel('Latitude').fill('40.7128');
    await page.getByLabel('Longitude').fill('-74.0060');

    // The QR canvas description should update once valid coordinates are provided
    await expect(page.getByRole('img', { name: /qr code for location/i })).toBeVisible();
  });

  test('"Use Current Location" fills fields and generates QR when permission is granted', async ({ page, context }) => {
    // Grant geolocation permission and mock coordinates via the browser context
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });

    await page.getByRole('button', { name: /use current location/i }).click();

    // Latitude and longitude fields should be populated
    await expect(page.getByLabel('Latitude')).toHaveValue('51.5074');
    await expect(page.getByLabel('Longitude')).toHaveValue('-0.1278');

    // A valid QR code should be rendered (img alt changes from "Empty" to content)
    await expect(page.getByRole('img', { name: /qr code for location - scan to view content/i })).toBeVisible();
  });

  test('"Use Current Location" shows loading state while fetching', async ({ page, context }) => {
    // We want to intercept the geolocation call before it resolves, so we use a
    // JavaScript override to make getCurrentPosition never call back immediately.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, _error?: PositionErrorCallback) => {
            // Intentionally never resolves – simulates an in-progress GPS request
          },
        },
        configurable: true,
      });
    });

    // Reload so the init script takes effect
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Location' }).click();
    await page.getByRole('button', { name: /use current location/i }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: /use current location/i }).click();

    // Button should show loading text and be disabled
    const btn = page.getByRole('button', { name: /fetching location/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('"Use Current Location" shows permission-denied error when access is denied', async ({ page }) => {
    // Override geolocation to immediately call the error callback with PERMISSION_DENIED
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (
            _success: PositionCallback,
            errorCb?: PositionErrorCallback
          ) => {
            errorCb?.({
              code: 1,
              message: 'User denied Geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        },
        configurable: true,
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Location' }).click();
    await page.getByRole('button', { name: /use current location/i }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: /use current location/i }).click();

    await expect(page.getByRole('alert')).toContainText(/location access denied/i);
  });

  test('"Use Current Location" shows unsupported message when geolocation is unavailable', async ({ page }) => {
    // Override navigator.geolocation to undefined
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Location' }).click();
    await page.getByRole('button', { name: /use current location/i }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: /use current location/i }).click();

    await expect(page.getByRole('alert')).toContainText(/not supported/i);
  });

  test('error clears and fields update on a subsequent successful fetch', async ({ page, context }) => {
    // First trigger an error
    await page.addInitScript(() => {
      let callCount = 0;
      Object.defineProperty(navigator, 'geolocation', {
        get() {
          return {
            getCurrentPosition: (
              successCb: PositionCallback,
              errorCb?: PositionErrorCallback
            ) => {
              callCount++;
              if (callCount === 1) {
                errorCb?.({
                  code: 1,
                  message: 'denied',
                  PERMISSION_DENIED: 1,
                  POSITION_UNAVAILABLE: 2,
                  TIMEOUT: 3,
                } as GeolocationPositionError);
              } else {
                successCb({
                  coords: {
                    latitude: 48.8566,
                    longitude: 2.3522,
                    accuracy: 10,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                  },
                  timestamp: Date.now(),
                } as GeolocationPosition);
              }
            },
          };
        },
        configurable: true,
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Location' }).click();
    await page.getByRole('button', { name: /use current location/i }).waitFor({ state: 'visible' });

    // Click 1 – should produce error
    await page.getByRole('button', { name: /use current location/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    // Click 2 – should clear error and populate fields
    await page.getByRole('button', { name: /use current location/i }).click();
    await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByLabel('Latitude')).toHaveValue('48.8566');
    await expect(page.getByLabel('Longitude')).toHaveValue('2.3522');
  });
});
