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

import { QRConfig, QRModules, SocialFormat, TemplateStyle } from '../types';
import { drawQRInternal } from './qrRenderer';

/**
 * Standard high-resolution dimensions for each social media format.
 * Width × Height in pixels (portrait-first for Story/Portrait).
 */
export const SOCIAL_DIMENSIONS: Record<SocialFormat, { width: number; height: number }> = {
  [SocialFormat.SQUARE_1_1]: { width: 1080, height: 1080 },
  [SocialFormat.PORTRAIT_4_5]: { width: 1080, height: 1350 },
  [SocialFormat.STORY_9_16]: { width: 1080, height: 1920 },
};

/**
 * Derives the CSS aspect-ratio string from a SocialFormat enum value.
 */
export function getAspectRatioCss(format: SocialFormat): string {
  const { width, height } = SOCIAL_DIMENSIONS[format];
  return `${width}/${height}`;
}

// ---------------------------------------------------------------------------
// Private template background painters
// ---------------------------------------------------------------------------

/**
 * Fills the entire canvas with the QR code's background colour.
 * Used for TemplateStyle.NONE – no decorative chrome, just a solid colour.
 */
function drawNoneBackground(
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  width: number,
  height: number
): void {
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Minimalist template: solid bgColor background with a thin fg-coloured
 * rectangular frame, optional headline above the QR zone, and optional
 * subtext below the QR zone.
 */
function drawMinimalistBackground(
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  width: number,
  height: number
): void {
  // Background
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, width, height);

  // Outer decorative frame (stroke only, no fill)
  const frameInset = width * 0.03;
  ctx.strokeStyle = config.fgColor;
  ctx.lineWidth = Math.max(1, width * 0.008);
  ctx.strokeRect(
    frameInset,
    frameInset,
    width - 2 * frameInset,
    height - 2 * frameInset
  );
}

/**
 * Gradient-blur template: draws a few blurred blobs using fg/bg colours to
 * create a soft gradient background.  A semi-transparent overlay then
 * improves contrast for the QR code zone.
 */
function drawGradientBlurBackground(
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  width: number,
  height: number
): void {
  // Base fill
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, width, height);

  // Draw soft radial blobs using fg colour at low opacity
  const blobRadius = width * 0.55;
  const blobs: Array<[number, number]> = [
    [width * 0.2, height * 0.2],
    [width * 0.8, height * 0.3],
    [width * 0.5, height * 0.8],
  ];

  for (const [bx, by] of blobs) {
    const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, blobRadius);
    gradient.addColorStop(0, hexToRgba(config.fgColor, 0.18));
    gradient.addColorStop(1, hexToRgba(config.fgColor, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Solid-frame template: uses fgColor as the outer border/frame and bgColor
 * as the inner background.
 */
function drawSolidFrameBackground(
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  width: number,
  height: number
): void {
  // Outer solid band
  ctx.fillStyle = config.fgColor;
  ctx.fillRect(0, 0, width, height);

  // Inner recessed area
  const inset = width * 0.06;
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(inset, inset, width - 2 * inset, height - 2 * inset);
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function drawTemplateText(
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  displayWidth: number,
  displayHeight: number,
  qrY: number,
  qrSize: number
): void {
  const headline = config.templateHeadline?.trim() ?? '';
  const subtext = config.templateSubtext?.trim() ?? '';

  if (!headline && !subtext) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = config.fgColor;

  if (headline) {
    const headlineFontSize = Math.round(displayWidth * 0.055);
    ctx.font = `bold ${headlineFontSize}px sans-serif`;
    const headlineY = qrY - headlineFontSize * 1.5;
    ctx.fillText(headline, displayWidth / 2, Math.max(headlineFontSize * 1.5, headlineY), displayWidth * 0.9);
  }

  if (subtext) {
    const subtextFontSize = Math.round(displayWidth * 0.038);
    ctx.font = `${subtextFontSize}px sans-serif`;
    const subtextY = qrY + qrSize + subtextFontSize * 1.5;
    ctx.fillText(subtext, displayWidth / 2, Math.min(displayHeight - subtextFontSize * 1.5, subtextY), displayWidth * 0.9);
  }
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Composes a full-canvas social-media export by:
 *  1. Painting the chosen template background.
 *  2. Translating / scaling the coordinate system so the QR code fits in a
 *     centred bounding-box (50 % of canvas width).
 *  3. Calling {@link drawQRInternal} inside that bounding-box (Decorator
 *     pattern – no QR logic is duplicated here).
 *  4. Restoring the context and drawing optional headline/subtext.
 *
 * For `TemplateStyle.NONE` with a square format this is equivalent to a
 * direct `drawQRInternal` call, so it can replace the existing code path
 * without visual regression.
 *
 * @param ctx           The 2-D drawing context (canvas or SVG-context).
 * @param modules       The raw QR module matrix.
 * @param config        Full QR configuration including template settings.
 * @param logoImg       Pre-loaded centre logo image (or null).
 * @param borderLogoImg Pre-loaded border logo image (or null).
 * @param displayWidth  Logical display width in px (no devicePixelRatio applied).
 * @param displayHeight Logical display height in px.
 * @param moduleCount   Number of QR modules per row/column.
 */
export function drawWithTemplate(
  ctx: CanvasRenderingContext2D,
  modules: QRModules,
  config: QRConfig,
  logoImg: HTMLImageElement | null,
  borderLogoImg: HTMLImageElement | null,
  displayWidth: number,
  displayHeight: number,
  moduleCount: number
): void {
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // ── 1. Background ──────────────────────────────────────────────────────────
  switch (config.templateStyle) {
    case TemplateStyle.MINIMALIST:
      drawMinimalistBackground(ctx, config, displayWidth, displayHeight);
      break;
    case TemplateStyle.GRADIENT_BLUR:
      drawGradientBlurBackground(ctx, config, displayWidth, displayHeight);
      break;
    case TemplateStyle.SOLID_FRAME:
      drawSolidFrameBackground(ctx, config, displayWidth, displayHeight);
      break;
    default:
      drawNoneBackground(ctx, config, displayWidth, displayHeight);
  }

  // ── 2. QR Bounding-Box ────────────────────────────────────────────────────
  // QR occupies 50 % of the canvas width (centered horizontally).
  // For NONE template on a square canvas the QR fills 100 % so it looks
  // identical to the previous rendering path.
  const isNoneSquare =
    config.templateStyle === TemplateStyle.NONE &&
    config.socialFormat === SocialFormat.SQUARE_1_1;

  const qrSize = isNoneSquare ? displayWidth : displayWidth * 0.5;
  const qrX = (displayWidth - qrSize) / 2;
  const qrY = (displayHeight - qrSize) / 2;

  // ── 3. Draw QR Inside Bounding-Box ────────────────────────────────────────
  const scale = qrSize / displayWidth;

  ctx.save();
  ctx.translate(qrX, qrY);
  ctx.scale(scale, scale);

  // drawQRInternal works in the logical [0, displayWidth] × [0, displayWidth]
  // coordinate space; we pass displayWidth as both width and height because
  // the QR is always square.
  drawQRInternal(
    ctx as unknown as CanvasRenderingContext2D,
    modules,
    config,
    logoImg,
    borderLogoImg,
    displayWidth,
    moduleCount
  );

  ctx.restore();

  // ── 4. Headline / Subtext ─────────────────────────────────────────────────
  if (config.templateStyle !== TemplateStyle.NONE) {
    drawTemplateText(ctx, config, displayWidth, displayHeight, qrY, qrSize);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Converts a CSS hex colour string (e.g. "#1a2b3c") to an rgba() string with
 * the given alpha value.  Falls back to transparent if parsing fails.
 * Supports both 3-char (#rgb) and 6-char (#rrggbb) hex notation.
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  // Expand 3-char shorthand (#rgb → #rrggbb)
  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}
