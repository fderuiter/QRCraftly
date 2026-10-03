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


import { vi } from 'vitest';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '@/types';
import type { UseOpticalReceiverOptions, UseOpticalSenderOptions } from '../client';

/** A plain, high-contrast configuration for transfer hook tests. */
export const transferTestConfig: QRConfig = {
  value: 'Hello',
  type: QRType.TEXT,
  fgColor: '#000000',
  bgColor: '#ffffff',
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.2,
  logoPaddingStyle: 'none',
  logoPadding: 1,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: QRErrorCorrectionLevel.M,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderColor: '#000000',
  borderStyle: 'solid',
  borderText: '',
  borderTextPosition: 'bottom-center',
  borderTextColor: '#ffffff',
  borderLogoUrl: null,
  borderLogoPosition: 'bottom-center',
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
  templateHeadline: '',
  templateSubtext: '',
  templateQrScale: 1.0,
};

/**
 * Sender options with a no-op renderer and a scannability gate that always passes.
 * @param overrides Options to replace.
 */
export function senderOptions(overrides: Partial<UseOpticalSenderOptions> = {}): UseOpticalSenderOptions {
  return {
    config: transferTestConfig,
    logoImg: null,
    borderLogoImg: null,
    renderFrame: vi.fn(),
    verifyFrame: vi.fn(async () => true),
    ...overrides,
  };
}

/**
 * Receiver options with a spy file saver.
 * @param overrides Options to replace.
 */
export function receiverOptions(overrides: Partial<UseOpticalReceiverOptions> = {}) {
  return {
    saveFile: vi.fn(),
    ...overrides,
  } satisfies UseOpticalReceiverOptions;
}
