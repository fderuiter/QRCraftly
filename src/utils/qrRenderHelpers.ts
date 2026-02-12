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

export interface ModuleNeighbors {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export const drawEyePattern = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  x: number,
  y: number,
  cellSize: number
) => {
  const size = 7 * cellSize;
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.fillStyle = config.eyeColor;

  // Helper to punch hole with bgColor
  const clearShape = (drawFn: () => void) => {
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = config.bgColor;
    drawFn();
    ctx.fillStyle = prevFill; // Restore
  };

  switch (config.style) {
    case QRStyle.MODERN: // Rounded Squares
      // Frame (Less rounded for robustness)
      ctx.beginPath();
      drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
      ctx.fill();
      // Hole
      clearShape(() => {
        ctx.beginPath();
        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize, cellSize * 0.8);
        ctx.fill();
      });

      // Eyeball (Solid Square with slight rounding)
      ctx.beginPath();
      drawRoundRect(ctx, x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize, cellSize * 0.5);
      ctx.fill();
      break;

    case QRStyle.SWISS: // Swiss Dot
      // Frame: Standard Square with Rounded Corners (Like Modern, robust)
      ctx.beginPath();
      drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
      ctx.fill();
      // Hole
      clearShape(() => {
        ctx.beginPath();
        // Standard Hole (Radius 2.5, Diameter 5)
        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize, cellSize * 0.8);
        ctx.fill();
      });

      // Eyeball: Floating Dot (Circular)
      ctx.beginPath();
      // Standard Radius 1.5 (Diameter 3)
      ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
      ctx.fill();
      break;

    case QRStyle.FLUID: // Fluid
      // COPY OF SWISS (Proven to pass)
      // Frame: Standard Square with Rounded Corners
      ctx.beginPath();
      drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
      ctx.fill();

      clearShape(() => {
        ctx.beginPath();
        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize, cellSize * 0.8);
        ctx.fill();
      });

      // Eyeball: Circular (Same as Swiss)
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
      ctx.fill();
      break;

    case QRStyle.CIRCUIT: // Cyber-Circuit (Brackets + Notched)
      // Frame: Solid box with "simulated" brackets via small white lines
      ctx.fillRect(x, y, size, size);

      clearShape(() => {
        // Standard Hole
        ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
      });

      // Simulate brackets by drawing small white lines over the frame
      // We need to temporarily set fillStyle to bgColor, but clearShape already does that for the hole.
      // Here we need to draw ON TOP of the filled rect with bgColor.
      {
          const prevFill = ctx.fillStyle;
          ctx.fillStyle = config.bgColor;
          const gap = cellSize * 0.5;
          ctx.fillRect(cx - gap / 2, y, gap, cellSize * 1.1); // Top cut
          ctx.fillRect(cx - gap / 2, y + size - cellSize * 1.1, gap, cellSize * 1.1); // Bottom cut
          ctx.fillRect(x, cy - gap / 2, cellSize * 1.1, gap); // Left cut
          ctx.fillRect(x + size - cellSize * 1.1, cy - gap / 2, cellSize * 1.1, gap); // Right cut
          ctx.fillStyle = prevFill;
      }

      // Eyeball: Notched Square
      ctx.beginPath();
      // Standard 3x3 square
      ctx.rect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
      ctx.fill();
      // Add slight notch via clearing
      clearShape(() => {
        ctx.fillRect(x + 4.6 * cellSize, y + 4.6 * cellSize, 0.4 * cellSize, 0.4 * cellSize);
      });
      break;

    case QRStyle.HIVE: // Hexagon
      // Frame: Standard Square
      ctx.fillRect(x, y, size, size);

      clearShape(() => {
        // Standard Hole
        ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
      });

      // Eyeball: Solid Hex (This is fine usually if large enough)
      drawPoly(ctx, cx, cy, 1.8 * cellSize, 6, 0, true);
      break;

    case QRStyle.GRUNGE: // Grunge
      // Frame
      drawRoughRect(ctx, x, y, size, size);

      clearShape(() => {
        ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
      });

      // Eyeball - Solid rough polygon
      drawScribble(ctx, x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize);
      break;

    case QRStyle.STARBURST:
      // Frame: Standard Square (Spikes on outside kill detection)
      ctx.fillRect(x, y, size, size);

      clearShape(() => {
        // Standard Hole
        ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
      });

      // Eyeball: Star
      // Make it fat
      drawStar(ctx, cx, cy, 1.9 * cellSize, 1.2 * cellSize, 5, true);
      break;

    case QRStyle.STANDARD:
    default:
      // Standard
      ctx.fillRect(x, y, size, size);
      clearShape(() => {
        ctx.clearRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
        ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize);
      });
      ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
      break;
  }
};

export const drawModuleBatch = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  x: number,
  y: number,
  cellSize: number,
  neighbors?: ModuleNeighbors
) => {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;

  switch (config.style) {
    case QRStyle.MODERN:
      drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.3);
      break;
    case QRStyle.SWISS:
      ctx.moveTo(cx + (cellSize / 2 * 1.05), cy);
      ctx.arc(cx, cy, cellSize / 2 * 1.05, 0, Math.PI * 2);
      break;
    case QRStyle.FLUID:
      ctx.moveTo(cx + (cellSize / 2 * 1.1), cy);
      ctx.arc(cx, cy, cellSize / 2 * 1.1, 0, Math.PI * 2);
      break;
    case QRStyle.CIRCUIT:
      {
        // Full square with very tiny notches
        drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);

        if (neighbors) {
            // Draw lines to neighbors
            const thickness = cellSize * 0.4;
            if (neighbors.right) ctx.rect(cx, cy - thickness / 2, cellSize / 2 + 1, thickness);
            if (neighbors.bottom) ctx.rect(cx - thickness / 2, cy, thickness, cellSize / 2 + 1);
            if (neighbors.left) ctx.rect(x, cy - thickness / 2, cellSize / 2 + 1, thickness);
            if (neighbors.top) ctx.rect(cx - thickness / 2, y, thickness, cellSize / 2 + 1);
        }
      }
      break;
    case QRStyle.HIVE:
      // Massive Hexagon
      drawPoly(ctx, cx, cy, cellSize / 1.55, 6, 0, true, true);
      break;
    case QRStyle.GRUNGE:
      // Full size rough rect, minimal jitter
      drawRoughRect(ctx, x, y, cellSize, cellSize, true);
      break;
    case QRStyle.STARBURST:
      // Fat star - nearly a square
      drawStar(ctx, cx, cy, cellSize / 1.5, cellSize / 2.2, 5, true, true);
      break;
    case QRStyle.STANDARD:
    default:
      ctx.rect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
      break;
  }
};
