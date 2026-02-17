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

import { QRConfig, QRStyle } from '../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from './canvasHelpers';

export interface QRModules {
  size: number;
  get(row: number, col: number): any;
}

export interface DrawQRProps {
  ctx: CanvasRenderingContext2D;
  config: QRConfig;
  modules: QRModules;
  images: {
    logo: HTMLImageElement | null;
    borderLogo: HTMLImageElement | null;
  };
  size: number;
  pixelRatio: number;
}

/**
 * Renders the QR code onto the canvas context.
 * This function handles module generation, styling, and logo embedding.
 */
export const drawQR = ({
  ctx,
  config,
  modules,
  images,
  size,
  pixelRatio
}: DrawQRProps) => {
  const displaySize = size;
  const rawSize = displaySize * pixelRatio;
  const { logo: logoImg, borderLogo: borderLogoImg } = images;

  // Clear canvas initially
  ctx.clearRect(0, 0, rawSize, rawSize);

  try {
    const moduleCount = modules.size;

    ctx.scale(pixelRatio, pixelRatio);

    let drawX = 0;
    let drawY = 0;
    let drawSize = displaySize;

    // Draw Border if enabled
    if (config.isBorderEnabled && config.borderSize > 0) {
        const borderPx = displaySize * config.borderSize;

        // Draw Border Background
        ctx.fillStyle = config.borderColor;
        ctx.fillRect(0, 0, displaySize, displaySize);

        // Draw Patterns based on style
        if (config.borderStyle === 'dashed' || config.borderStyle === 'dotted') {
            ctx.strokeStyle = config.bgColor; // Use background color for contrast
            ctx.lineWidth = borderPx * 0.2;
            if (config.borderStyle === 'dashed') {
                ctx.setLineDash([borderPx * 0.5, borderPx * 0.5]);
            } else {
                ctx.setLineDash([borderPx * 0.2, borderPx * 0.2]); // Dotted
            }
            ctx.strokeRect(borderPx * 0.5, borderPx * 0.5, displaySize - borderPx, displaySize - borderPx);
            ctx.setLineDash([]); // Reset
        } else if (config.borderStyle === 'double') {
            ctx.strokeStyle = config.bgColor;
            ctx.lineWidth = borderPx * 0.15;
            const offset = borderPx * 0.3;
            ctx.strokeRect(offset, offset, displaySize - offset * 2, displaySize - offset * 2);
        }

        // Adjust area for QR code
        drawX = borderPx;
        drawY = borderPx;
        drawSize = displaySize - (borderPx * 2);

        // Fill background for QR code
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(drawX, drawY, drawSize, drawSize);
    } else {
        // Fill Background
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(0, 0, displaySize, displaySize);
    }

    // Helper to determine if a module is an "eye"
    const isEye = (row: number, col: number): boolean => {
      if (row < 7 && col < 7) return true;
      if (row < 7 && col >= moduleCount - 7) return true;
      if (row >= moduleCount - 7 && col < 7) return true;
      return false;
    };

    const cellSize = drawSize / moduleCount;

    // --- DRAWING HELPERS ---

    // Helper to punch hole with bgColor
    const clearShape = (drawFn: () => void) => {
        ctx.fillStyle = config.bgColor;
        drawFn();
        ctx.fillStyle = config.eyeColor; // Restore
    };

    const drawEyePattern = (r: number, c: number) => {
        const x = drawX + c * cellSize;
        const y = drawY + r * cellSize;
        const size = 7 * cellSize;

        ctx.fillStyle = config.eyeColor;

        const cx = x + size / 2;
        const cy = y + size / 2;

        const drawRoundedEyeFrame = () => {
             // Frame (Less rounded for robustness)
             ctx.beginPath();
             drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
             ctx.fill();
             // Hole
             clearShape(() => {
                  ctx.beginPath();
                  drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
                  ctx.fill();
             });
        };

        const drawSquareEyeFrame = () => {
             // Frame: Standard Square
             ctx.fillRect(x, y, size, size);

             clearShape(() => {
                 // Standard Hole
                 ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
             });
        };

        switch (config.style) {
            case QRStyle.MODERN: // Rounded Squares
                drawRoundedEyeFrame();

                // Eyeball (Solid Square with slight rounding)
                ctx.beginPath();
                drawRoundRect(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize, cellSize * 0.5);
                ctx.fill();
                break;

            case QRStyle.SWISS: // Swiss Dot
                drawRoundedEyeFrame();

                // Eyeball: Floating Dot (Circular)
                ctx.beginPath();
                // Standard Radius 1.5 (Diameter 3)
                ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                ctx.fill();
                break;

            case QRStyle.FLUID: // Fluid
                // COPY OF SWISS (Proven to pass)
                drawRoundedEyeFrame();

                // Eyeball: Circular (Same as Swiss)
                ctx.beginPath();
                ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                ctx.fill();
                break;

            case QRStyle.CIRCUIT: // Cyber-Circuit (Brackets + Notched)
                 drawSquareEyeFrame();

                 // Simulate brackets by drawing small white lines over the frame
                 ctx.fillStyle = config.bgColor;
                 const gap = cellSize * 0.5;
                 ctx.fillRect(cx - gap/2, y, gap, cellSize * 1.1); // Top cut
                 ctx.fillRect(cx - gap/2, y + size - cellSize*1.1, gap, cellSize*1.1); // Bottom cut
                 ctx.fillRect(x, cy - gap/2, cellSize * 1.1, gap); // Left cut
                 ctx.fillRect(x + size - cellSize*1.1, cy - gap/2, cellSize * 1.1, gap); // Right cut
                 ctx.fillStyle = config.eyeColor;

                 // Eyeball: Notched Square
                 ctx.beginPath();
                 // Standard 3x3 square
                 ctx.rect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                 ctx.fill();
                 // Add slight notch via clearing
                 clearShape(() => {
                    ctx.fillRect(x + 4.6*cellSize, y + 4.6*cellSize, 0.4*cellSize, 0.4*cellSize);
                 });
                 break;

            case QRStyle.HIVE: // Hexagon
                drawSquareEyeFrame();

                // Eyeball: Solid Hex (This is fine usually if large enough)
                drawPoly(ctx, cx, cy, 1.8 * cellSize, 6, 0, true);
                break;

            case QRStyle.GRUNGE: // Grunge
                // Frame
                drawRoughRect(ctx, x, y, size, size);

                clearShape(() => {
                    ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                });

                // Eyeball - Solid rough polygon
                drawScribble(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize);
                break;

            case QRStyle.STARBURST:
                 drawSquareEyeFrame();

                 // Eyeball: Star
                 // Make it fat
                 drawStar(ctx, cx, cy, 1.9*cellSize, 1.2*cellSize, 5, true);
                 break;

            case QRStyle.STANDARD:
            default:
                // Standard
                ctx.fillRect(x, y, size, size);
                clearShape(() => {
                     ctx.clearRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                     ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                });
                ctx.fillRect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                break;
        }
    };

    // Determine safe limit for logo size
    const SAFE_AREA_RATIO = (() => {
       switch(config.errorCorrectionLevel) {
           case 'L': return 0.22;
           case 'M': return 0.35;
           case 'Q': return 0.45;
           case 'H': default: return 0.50;
       }
    })();

    const requestedLogoSizeModules = config.logoSize * moduleCount;
    const paddingModules = config.logoPaddingStyle === 'none' ? 0 : config.logoPadding;
    const requestedCutoutModules = requestedLogoSizeModules + (paddingModules * 2);

    let effectiveLogoSizeModules = requestedLogoSizeModules;
    let effectivePaddingModules = paddingModules;

    if (requestedCutoutModules > moduleCount * SAFE_AREA_RATIO) {
        const maxCutoutModules = moduleCount * SAFE_AREA_RATIO;
        const scaleFactor = maxCutoutModules / requestedCutoutModules;
        effectiveLogoSizeModules = requestedLogoSizeModules * scaleFactor;
        effectivePaddingModules = paddingModules * scaleFactor;
    }

    const logoSizePx = effectiveLogoSizeModules * cellSize;
    const logoPaddingPx = effectivePaddingModules * cellSize;
    const cutoutModuleSize = effectiveLogoSizeModules + (effectivePaddingModules * 2);
    const center = moduleCount / 2;

    const isCoveredByLogo = !config.logoUrl ? (() => false) : (r: number, c: number) => {
      const x = c - center + 0.5;
      const y = r - center + 0.5;
      if (config.logoPaddingStyle === 'circle') {
        const radius = (cutoutModuleSize / 2);
        return (x * x + y * y) < (radius * radius);
      } else {
        const halfSize = (cutoutModuleSize / 2);
        return Math.abs(x) < halfSize && Math.abs(y) < halfSize;
      }
    };

    // Draw Modules
    ctx.fillStyle = config.fgColor;

    // Optimization: Batch drawing for compatible styles to reduce draw calls
    const isBatchable = [
        QRStyle.STANDARD, QRStyle.MODERN, QRStyle.SWISS, QRStyle.FLUID, QRStyle.CIRCUIT,
        QRStyle.HIVE, QRStyle.GRUNGE, QRStyle.STARBURST
    ].includes(config.style);

    if (isBatchable) {
        ctx.beginPath();
    }

    // Hoist draw function to avoid switch inside loop (Optimization)
    let drawModuleFn: ((r: number, c: number, x: number, y: number, cx: number, cy: number) => void) | null = null;

    if (isBatchable) {
         switch(config.style) {
             case QRStyle.MODERN:
                 drawModuleFn = (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.3);
                 break;
             case QRStyle.SWISS:
                 drawModuleFn = (_r, _c, _x, _y, cx, cy) => {
                     ctx.moveTo(cx + (cellSize/2 * 1.05), cy);
                     ctx.arc(cx, cy, cellSize/2 * 1.05, 0, Math.PI*2);
                 };
                 break;
             case QRStyle.FLUID:
                 drawModuleFn = (_r, _c, _x, _y, cx, cy) => {
                     ctx.moveTo(cx + (cellSize/2 * 1.1), cy);
                     ctx.arc(cx, cy, cellSize/2 * 1.1, 0, Math.PI*2);
                 };
                 break;
             case QRStyle.CIRCUIT:
                 drawModuleFn = (r, c, x, y, cx, cy) => {
                     const hasTop = r > 0 && modules.get(r-1, c) && !isCoveredByLogo(r-1, c) && !isEye(r-1, c);
                     const hasBottom = r < moduleCount-1 && modules.get(r+1, c) && !isCoveredByLogo(r+1, c) && !isEye(r+1, c);
                     const hasLeft = c > 0 && modules.get(r, c-1) && !isCoveredByLogo(r, c-1) && !isEye(r, c-1);
                     const hasRight = c < moduleCount-1 && modules.get(r, c+1) && !isCoveredByLogo(r, c+1) && !isEye(r, c+1);

                     // Full square with very tiny notches
                     drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);

                     // Draw lines to neighbors
                     const thickness = cellSize * 0.4;
                     if (hasRight) ctx.rect(cx, cy - thickness/2, cellSize/2 + 1, thickness);
                     if (hasBottom) ctx.rect(cx - thickness/2, cy, thickness, cellSize/2 + 1);
                     if (hasLeft) ctx.rect(x, cy - thickness/2, cellSize/2 + 1, thickness);
                     if (hasTop) ctx.rect(cx - thickness/2, y, thickness, cellSize/2 + 1);
                 };
                 break;
             case QRStyle.HIVE:
                 drawModuleFn = (_r, _c, _x, _y, cx, cy) => drawPoly(ctx, cx, cy, cellSize/1.55, 6, 0, true, true);
                 break;
             case QRStyle.GRUNGE:
                 drawModuleFn = (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
                 break;
             case QRStyle.STARBURST:
                 drawModuleFn = (_r, _c, _x, _y, cx, cy) => drawStar(ctx, cx, cy, cellSize/1.5, cellSize/2.2, 5, true, true);
                 break;
             case QRStyle.STANDARD:
             default:
                 drawModuleFn = (_r, _c, x, y, _cx, _cy) => ctx.rect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
                 break;
         }
    }

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (isEye(r, c)) continue;

        if (modules.get(r, c)) {
          if (isCoveredByLogo(r, c)) continue;

          const x = drawX + c * cellSize;
          const y = drawY + r * cellSize;
          const cx = x + cellSize/2;
          const cy = y + cellSize/2;

          if (isBatchable && drawModuleFn) {
               drawModuleFn(r, c, x, y, cx, cy);
          }
        }
      }
    }

    if (isBatchable) {
        ctx.fill();
    }

    // Draw Eyes (Last to ensure they overlap nicely if needed)
    drawEyePattern(0, 0);
    drawEyePattern(0, moduleCount - 7);
    drawEyePattern(moduleCount - 7, 0);

    // Draw Center Logo
    if (config.logoUrl && logoImg) {
        const lx = (displaySize - logoSizePx) / 2;
        const ly = (displaySize - logoSizePx) / 2;

        if (config.logoPaddingStyle !== 'none') {
            ctx.fillStyle = config.logoBackgroundColor || config.bgColor;
            if (config.logoPaddingStyle === 'circle') {
                ctx.beginPath();
                const radius = (logoSizePx / 2) + logoPaddingPx;
                ctx.arc(displaySize/2, displaySize/2, radius, 0, Math.PI*2);
                ctx.fill();
            } else {
                const padding = logoPaddingPx;
                ctx.fillRect(lx - padding, ly - padding, logoSizePx + (padding*2), logoSizePx + (padding*2));
            }
        }

        ctx.drawImage(logoImg, lx, ly, logoSizePx, logoSizePx);
    }

    // Draw Border Text and Logo
    if (config.isBorderEnabled && config.borderSize > 0) {
        const borderPx = displaySize * config.borderSize;
        if (config.borderText) {
            ctx.fillStyle = config.borderTextColor;
            const fontSize = borderPx * 0.4;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let tx = displaySize / 2;
            let ty = borderPx / 2;

            if (config.borderTextPosition === 'bottom-center') {
                ty = displaySize - (borderPx / 2);
            } else if (config.borderTextPosition === 'top-center') {
                ty = borderPx / 2;
            }
            ctx.fillText(config.borderText, tx, ty);
        }

        if (config.borderLogoUrl && borderLogoImg) {
            const blSize = borderPx * 0.8;
            let blx = (displaySize - blSize) / 2;
            let bly = displaySize - borderPx + (borderPx - blSize) / 2;

            if (config.borderLogoPosition === 'bottom-center') {
                blx = (displaySize - blSize) / 2;
                bly = displaySize - borderPx + (borderPx - blSize) / 2;
            } else if (config.borderLogoPosition === 'bottom-right') {
                blx = displaySize - borderPx - blSize;
                bly = displaySize - borderPx + (borderPx - blSize) / 2;
            }
            ctx.drawImage(borderLogoImg, blx, bly, blSize, blSize);
        }
    }
  } catch (err) {
    console.warn("QR generation failed:", err);
  }
};
