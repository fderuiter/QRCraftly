import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect } from '../canvasHelpers';
import { isEye, getIsCoveredByLogo, LogoMetrics } from './utils';

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
        if (isEye(r, c, moduleCount)) continue;

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
};
