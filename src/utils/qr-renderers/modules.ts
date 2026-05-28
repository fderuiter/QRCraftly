import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawRoughRect } from '../canvasHelpers';
import { getIsCoveredByLogo, LogoMetrics } from './utils';

type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

const getModuleDrawer = (
  style: QRStyle,
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  modules: QRModules,
  moduleCount: number,
  isCoveredByLogo: (r: number, c: number) => boolean,
): DrawModuleFn => {
  switch (style) {
    case QRStyle.MODERN: {
      const rModern = cellSize * 0.3;
      return (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, rModern);
    }
    case QRStyle.SWISS: {
      const rSwiss = (cellSize / 2) * 1.05;
      return (_r, _c, _x, _y, cx, cy) => {
        ctx.moveTo(cx + rSwiss, cy);
        ctx.arc(cx, cy, rSwiss, 0, Math.PI * 2);
      };
    }
    case QRStyle.FLUID: {
      const rFluid = (cellSize / 2) * 1.1;
      return (_r, _c, _x, _y, cx, cy) => {
        ctx.moveTo(cx + rFluid, cy);
        ctx.arc(cx, cy, rFluid, 0, Math.PI * 2);
      };
    }
    case QRStyle.CIRCUIT: {
      // Pre-calculate valid modules for CIRCUIT style to avoid repeated expensive checks
      // (isCoveredByLogo and isEye) for every neighbor of every module.
      const validGrid = new Uint8Array(moduleCount * moduleCount);

      // Optimization: Apply section-splitting to skip known dead zones (eyes) entirely.
      // This avoids calling isEye() inside the loop for every module and uses flat 1D indexing.

      // Top Section (Rows 0-6): Skip TL (0-6) and TR (size-7 to size-1)
      for (let r = 0; r < 7; r++) {
        const rowOffset = r * moduleCount;
        for (let c = 7; c < moduleCount - 7; c++) {
          if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
            validGrid[rowOffset + c] = 1;
          }
        }
      }

      // Middle Section (Rows 7 to size-8): No eyes
      for (let r = 7; r < moduleCount - 7; r++) {
        const rowOffset = r * moduleCount;
        for (let c = 0; c < moduleCount; c++) {
          if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
            validGrid[rowOffset + c] = 1;
          }
        }
      }

      // Bottom Section (Rows size-7 to size-1): Skip BL (0-6)
      for (let r = moduleCount - 7; r < moduleCount; r++) {
        const rowOffset = r * moduleCount;
        for (let c = 7; c < moduleCount; c++) {
          if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
            validGrid[rowOffset + c] = 1;
          }
        }
      }

      // Pre-calculate dimensional constants
      const rCircuit = cellSize * 0.1;
      const thickness = cellSize * 0.4;
      const thicknessHalf = thickness / 2;
      const linkLen = cellSize / 2 + 1;

      return (r, c, x, y, cx, cy) => {
        // Optimization: use flat 1D indexing to check neighbors
        const idx = r * moduleCount + c;
        const hasTop = r > 0 && validGrid[idx - moduleCount];
        const hasBottom = r < moduleCount - 1 && validGrid[idx + moduleCount];
        const hasLeft = c > 0 && validGrid[idx - 1];
        const hasRight = c < moduleCount - 1 && validGrid[idx + 1];

        // Full square with very tiny notches
        drawRoundRect(ctx, x, y, cellSize, cellSize, rCircuit);

        // Draw lines to neighbors
        if (hasRight) ctx.rect(cx, cy - thicknessHalf, linkLen, thickness);
        if (hasBottom) ctx.rect(cx - thicknessHalf, cy, thickness, linkLen);
        if (hasLeft) ctx.rect(x, cy - thicknessHalf, linkLen, thickness);
        if (hasTop) ctx.rect(cx - thicknessHalf, y, thickness, linkLen);
      };
    }
    case QRStyle.HIVE: {
      // Optimization: Pre-calculate hexagon offsets using a flat Float64Array
      // instead of objects or nested arrays. This improves performance in the
      // hot rendering loop by avoiding object allocations and taking advantage
      // of continuous memory, without sacrificing readability.
      const rHive = cellSize / 1.55;
      const sidesHive = 6;

      const offsets = new Float64Array(sidesHive * 2);
      for (let i = 0; i < sidesHive; i++) {
        const theta = (i * 2 * Math.PI) / sidesHive;
        offsets[i * 2] = rHive * Math.cos(theta);
        offsets[i * 2 + 1] = rHive * Math.sin(theta);
      }

      return (_r, _c, _x, _y, cx, cy) => {
        ctx.moveTo(cx + offsets[0], cy + offsets[1]);
        for (let i = 1; i < sidesHive; i++) {
          ctx.lineTo(cx + offsets[i * 2], cy + offsets[i * 2 + 1]);
        }
        ctx.closePath();
      };
    }
    case QRStyle.GRUNGE:
      return (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
    case QRStyle.STARBURST: {
      // Optimization: Pre-calculate starburst offsets using a flat Float64Array
      // instead of an array of objects. This improves performance in the hot
      // rendering loop by avoiding object allocations while maintaining clean loops.
      const outerR = cellSize / 1.5;
      const innerR = cellSize / 2.2;
      const spikes = 5;
      const step = Math.PI / spikes;

      const offsets = new Float64Array(spikes * 4); // 2 points per spike, 2 coords per point
      let rot = (Math.PI / 2) * 3;

      for (let i = 0; i < spikes; i++) {
        const baseIdx = i * 4;
        offsets[baseIdx] = Math.cos(rot) * outerR;
        offsets[baseIdx + 1] = Math.sin(rot) * outerR;
        rot += step;

        offsets[baseIdx + 2] = Math.cos(rot) * innerR;
        offsets[baseIdx + 3] = Math.sin(rot) * innerR;
        rot += step;
      }

      return (_r, _c, _x, _y, cx, cy) => {
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < offsets.length; i += 2) {
          ctx.lineTo(cx + offsets[i], cy + offsets[i + 1]);
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
      };
    }
    case QRStyle.STANDARD:
    default: {
      // Optimization: Pre-calculate Math.ceil(cellSize) outside the inner rendering loop
      // to avoid redundant math operations for every drawn module.
      // Performance impact: Reduces execution time of STANDARD style rendering loop.
      const ceilCellSize = Math.ceil(cellSize);
      return (_r, _c, x, y, _cx, _cy) => ctx.rect(Math.floor(x), Math.floor(y), ceilCellSize, ceilCellSize);
    }
  }
};

export const renderModules = (
  ctx: CanvasRenderingContext2D,
  modules: QRModules,
  config: QRConfig,
  drawX: number,
  drawY: number,
  cellSize: number,
  moduleCount: number,
  logoMetrics: LogoMetrics,
) => {
  // Draw Modules
  ctx.fillStyle = config.fgColor;

  const isCoveredByLogo = getIsCoveredByLogo(config, moduleCount, logoMetrics);

  // Batch drawing for performance
  ctx.beginPath();

  const drawModuleFn = getModuleDrawer(config.style, ctx, cellSize, modules, moduleCount, isCoveredByLogo);

  const cellSizeHalf = cellSize / 2;

  // Pre-calculate X and Y coordinates to avoid redundant math in hot loops
  const xs = new Float64Array(moduleCount);
  const cxs = new Float64Array(moduleCount);
  for (let c = 0; c < moduleCount; c++) {
    xs[c] = drawX + c * cellSize;
    cxs[c] = xs[c] + cellSizeHalf;
  }

  const ys = new Float64Array(moduleCount);
  const cys = new Float64Array(moduleCount);
  for (let r = 0; r < moduleCount; r++) {
    ys[r] = drawY + r * cellSize;
    cys[r] = ys[r] + cellSizeHalf;
  }

  const drawModuleAt = (r: number, c: number) => {
    if (modules.get(r, c)) {
      if (isCoveredByLogo(r, c)) return;

      const x = xs[c];
      const y = ys[r];
      const cx = cxs[c];
      const cy = cys[r];

      drawModuleFn(r, c, x, y, cx, cy);
    }
  };

  // Optimization: Split loops to skip eye regions (TL, TR, BL) directly.
  // This avoids calling isEye() inside the loop for every module.

  // Top Section (Rows 0-6): Skip TL (0-6) and TR (size-7 to size-1)
  for (let r = 0; r < 7; r++) {
    for (let c = 7; c < moduleCount - 7; c++) {
      drawModuleAt(r, c);
    }
  }

  // Middle Section (Rows 7 to size-8): No eyes
  for (let r = 7; r < moduleCount - 7; r++) {
    for (let c = 0; c < moduleCount; c++) {
      drawModuleAt(r, c);
    }
  }

  // Bottom Section (Rows size-7 to size-1): Skip BL (0-6)
  for (let r = moduleCount - 7; r < moduleCount; r++) {
    for (let c = 7; c < moduleCount; c++) {
      drawModuleAt(r, c);
    }
  }

  ctx.fill();
};
