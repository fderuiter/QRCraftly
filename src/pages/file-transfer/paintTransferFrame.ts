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


import { SocialFormat, TemplateStyle } from '@/types';
import { drawQRInternal } from '@/packages/qr-matrix';
import type { TransferFrameRenderer } from '@/packages/optical-transfer/client';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '@/packages/qr-export';

/** CSS width, in pixels, of the transfer canvas. */
const DISPLAY_SIZE = 512;

/**
 * Paints one transfer frame onto the sender canvas, applying the social template when one is
 * selected. Injected into `useOpticalSender` so the package stays free of app renderers.
 * @param canvas Target canvas.
 * @param frame Module matrix to paint.
 * @param config Active QR configuration (already sanitized for stream frames).
 * @param logoImg Optional centre logo.
 * @param borderLogoImg Optional border logo.
 */
export const paintTransferFrame: TransferFrameRenderer = (canvas, frame, config, logoImg, borderLogoImg) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const modules = {
    size: frame.size,
    get: (r: number, c: number) => !!frame.data[r * frame.size + c],
  };
  const pixelRatio = window.devicePixelRatio || 1;
  const useTemplate = config.templateStyle !== TemplateStyle.NONE || config.socialFormat !== SocialFormat.SQUARE_1_1;
  const { width: formatWidth, height: formatHeight } = SOCIAL_DIMENSIONS[config.socialFormat];
  const displayHeight = useTemplate ? Math.round((DISPLAY_SIZE * formatHeight) / formatWidth) : DISPLAY_SIZE;

  canvas.width = DISPLAY_SIZE * pixelRatio;
  canvas.height = displayHeight * pixelRatio;
  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);
  if (useTemplate) {
    drawWithTemplate(ctx, modules, config, logoImg, borderLogoImg, DISPLAY_SIZE, displayHeight, modules.size);
  } else {
    ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    drawQRInternal(ctx, modules, config, logoImg, borderLogoImg, DISPLAY_SIZE, modules.size);
  }
  ctx.restore();
};
