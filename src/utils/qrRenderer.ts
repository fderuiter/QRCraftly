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
  const pixelRatio = window.devicePixelRatio || 1;
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
    renderModules(ctx, modules, config, drawX, drawY, cellSize, moduleCount, logoMetrics);

    // 5. Render Eyes
    renderEyes(ctx, config, drawX, drawY, cellSize, moduleCount);

    // 6. Render Center Logo
    renderLogo(ctx, config, logoImg, displaySize, logoMetrics);

    // 7. Render Border Decorations
    if (config.isBorderEnabled && config.borderSize > 0) {
        renderBorderDecoration(ctx, config, displaySize, borderPx, borderLogoImg);
    }

  } catch (err) {
    console.warn("QR generation failed:", err);
  }
};
