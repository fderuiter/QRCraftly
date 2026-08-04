import { QRConfig, QRModules } from '../types';
import { calculateLayout, getLogoMetrics } from './qr-renderers/utils';
import { renderBorder, renderBorderDecoration } from './qr-renderers/border';
import { renderModules } from './qr-renderers/modules';
import { renderEyes } from './qr-renderers/eyes';
import { renderLogo } from './qr-renderers/logo';

/**
 * Renders the QR code onto the canvas.
 * This function handles module generation, styling, and logo embedding.
 */
export const drawQR = (
  ctx: CanvasRenderingContext2D,
  modules: QRModules,
  config: QRConfig,
  logoImg: HTMLImageElement | null,
  borderLogoImg: HTMLImageElement | null,
  size: number
) => {
  const canvas = ctx.canvas;

  // Setup scaling
  const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const displaySize = size;
  const rawSize = displaySize * pixelRatio;

  // Set the actual resolution of the canvas
  canvas.width = rawSize;
  canvas.height = rawSize;

  // Clear canvas initially
  ctx.clearRect(0, 0, rawSize, rawSize);

  try {
    const moduleCount = modules.size;

    ctx.scale(pixelRatio, pixelRatio);

    drawQRInternal(ctx as unknown as CanvasRenderingContext2D, modules, config, logoImg, borderLogoImg, displaySize, moduleCount);

  } catch (err) {
    console.warn("QR generation failed:", err);
  }
};

/**
 * Core rendering logic shared between the canvas and SVG export paths.
 * Works in logical display-pixel coordinates (no HiDPI scaling applied).
 *
 * @param ctx   Any context that satisfies the canvas 2D drawing API subset used here.
 * @param modules  The raw QR module data.
 * @param config   The QR configuration.
 * @param logoImg  Pre-loaded logo image (or null).
 * @param borderLogoImg Pre-loaded border-logo image (or null).
 * @param displaySize  The logical size in pixels to draw into.
 * @param moduleCount  Number of modules (rows/cols) in the QR grid.
 */
export const drawQRInternal = (
  ctx: CanvasRenderingContext2D,
  modules: QRModules,
  config: QRConfig,
  logoImg: HTMLImageElement | null,
  borderLogoImg: HTMLImageElement | null,
  displaySize: number,
  moduleCount: number,
  isVirtual: boolean = false
) => {
  // 1. Calculate Layout
  const { drawX, drawY, drawSize, cellSize, borderPx } = calculateLayout(config, displaySize, moduleCount);

  // 2. Calculate Logo Metrics
  const logoMetrics = getLogoMetrics(config, moduleCount, cellSize);

  // 3. Render Backgrounds & Border
  if (config.isBorderEnabled && config.borderSize > 0) {
    renderBorder(ctx, config, displaySize, borderPx);
    // Fill background for QR code area
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(drawX, drawY, drawSize, drawSize);
  } else {
    // Fill Full Background
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, displaySize, displaySize);
  }

  // 4. Render Modules
  renderModules(ctx, modules, config, drawX, drawY, cellSize, moduleCount, logoMetrics, isVirtual);

  // 5. Render Eyes
  renderEyes(ctx, config, drawX, drawY, cellSize, moduleCount);

  // 6. Render Center Logo
  renderLogo(ctx, config, logoImg, displaySize, logoMetrics);

  // 7. Render Border Decorations
  if (config.isBorderEnabled && config.borderSize > 0) {
    renderBorderDecoration(ctx, config, displaySize, borderPx, borderLogoImg);
  }
};
