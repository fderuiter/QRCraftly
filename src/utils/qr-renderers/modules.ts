import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect } from '../canvasHelpers';
import { isEye, getIsCoveredByLogo, LogoMetrics } from './utils';

type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

const getModuleDrawer = (
    style: QRStyle,
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    modules: QRModules,
    moduleCount: number,
    isCoveredByLogo: (r: number, c: number) => boolean
): DrawModuleFn => {
    switch(style) {
        case QRStyle.MODERN:
            return (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.3);
        case QRStyle.SWISS:
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx + (cellSize/2 * 1.05), cy);
                ctx.arc(cx, cy, cellSize/2 * 1.05, 0, Math.PI*2);
            };
        case QRStyle.FLUID:
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx + (cellSize/2 * 1.1), cy);
                ctx.arc(cx, cy, cellSize/2 * 1.1, 0, Math.PI*2);
            };
        case QRStyle.CIRCUIT:
            return (r, c, x, y, cx, cy) => {
                const hasTop = r > 0 && modules.get(r-1, c) && !isCoveredByLogo(r-1, c) && !isEye(r-1, c, moduleCount);
                const hasBottom = r < moduleCount-1 && modules.get(r+1, c) && !isCoveredByLogo(r+1, c) && !isEye(r+1, c, moduleCount);
                const hasLeft = c > 0 && modules.get(r, c-1) && !isCoveredByLogo(r, c-1) && !isEye(r, c-1, moduleCount);
                const hasRight = c < moduleCount-1 && modules.get(r, c+1) && !isCoveredByLogo(r, c+1) && !isEye(r, c+1, moduleCount);

                // Full square with very tiny notches
                drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);

                // Draw lines to neighbors
                const thickness = cellSize * 0.4;
                if (hasRight) ctx.rect(cx, cy - thickness/2, cellSize/2 + 1, thickness);
                if (hasBottom) ctx.rect(cx - thickness/2, cy, thickness, cellSize/2 + 1);
                if (hasLeft) ctx.rect(x, cy - thickness/2, cellSize/2 + 1, thickness);
                if (hasTop) ctx.rect(cx - thickness/2, y, thickness, cellSize/2 + 1);
            };
        case QRStyle.HIVE:
            return (_r, _c, _x, _y, cx, cy) => drawPoly(ctx, cx, cy, cellSize/1.55, 6, 0, true, true);
        case QRStyle.GRUNGE:
            return (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
        case QRStyle.STARBURST:
            return (_r, _c, _x, _y, cx, cy) => drawStar(ctx, cx, cy, cellSize/1.5, cellSize/2.2, 5, true, true);
        case QRStyle.STANDARD:
        default:
            return (_r, _c, x, y, _cx, _cy) => ctx.rect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
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
  logoMetrics: LogoMetrics
) => {
    // Draw Modules
    ctx.fillStyle = config.fgColor;

    const isCoveredByLogo = getIsCoveredByLogo(config, moduleCount, logoMetrics);

    // Batch drawing for performance
    ctx.beginPath();

    const drawModuleFn = getModuleDrawer(config.style, ctx, cellSize, modules, moduleCount, isCoveredByLogo);

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (isEye(r, c, moduleCount)) continue;

        if (modules.get(r, c)) {
          if (isCoveredByLogo(r, c)) continue;

          const x = drawX + c * cellSize;
          const y = drawY + r * cellSize;
          const cx = x + cellSize/2;
          const cy = y + cellSize/2;

          drawModuleFn(r, c, x, y, cx, cy);
        }
      }
    }

    ctx.fill();
};
