import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawRoughRect, drawPoly, drawStar } from '../canvasHelpers';

import { getIsCoveredByLogo, LogoMetrics, iterateMatrix } from './utils';

type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

const getModuleDrawer = (
    style: QRStyle,
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    modules: QRModules,
    moduleCount: number,
    isCoveredByLogo: (r: number, c: number) => boolean,
    isVirtual: boolean
): DrawModuleFn => {
    switch(style) {
        case QRStyle.MODERN: {
            const rModern = cellSize * 0.3;
            return (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, rModern);
        }
        case QRStyle.SWISS: {
            const rSwiss = (cellSize / 2) * 1.05;
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx + rSwiss, cy);
                ctx.arc(cx, cy, rSwiss, 0, Math.PI*2);
            };
        }
        case QRStyle.FLUID: {
            const rFluid = (cellSize / 2) * 1.1;
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx + rFluid, cy);
                ctx.arc(cx, cy, rFluid, 0, Math.PI*2);
            };
        }
        case QRStyle.CIRCUIT: {
            const validGrid = new Uint8Array(moduleCount * moduleCount);

            iterateMatrix(moduleCount, (r, c) => {
                if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
                    validGrid[r * moduleCount + c] = 1;
                }
            });

            const rCircuit = cellSize * 0.1;
            const thickness = cellSize * 0.4;
            const thicknessHalf = thickness / 2;
            const linkLen = cellSize / 2 + 1;

            return (r, c, x, y, cx, cy) => {
                const idx = r * moduleCount + c;
                const hasTop = r > 0 && validGrid[idx - moduleCount];
                const hasBottom = r < moduleCount-1 && validGrid[idx + moduleCount];
                const hasLeft = c > 0 && validGrid[idx - 1];
                const hasRight = c < moduleCount-1 && validGrid[idx + 1];

                drawRoundRect(ctx, x, y, cellSize, cellSize, rCircuit);

                if (hasRight) ctx.rect(cx, cy - thicknessHalf, linkLen, thickness);
                if (hasBottom) ctx.rect(cx - thicknessHalf, cy, thickness, linkLen);
                if (hasLeft) ctx.rect(x, cy - thicknessHalf, linkLen, thickness);
                if (hasTop) ctx.rect(cx - thicknessHalf, y, thickness, linkLen);
            };
        }
        case QRStyle.HIVE: {
            const rHive = cellSize / 1.55;
            return (_r, _c, _x, _y, cx, cy) => drawPoly(ctx, cx, cy, rHive, 6, 0, false, true);
        }
        case QRStyle.GRUNGE:
            return (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
        case QRStyle.STARBURST: {
            const outerR = cellSize / 1.5;
            const innerR = cellSize / 2.2;
            return (_r, _c, _x, _y, cx, cy) => drawStar(ctx, cx, cy, outerR, innerR, 5, false, true);
        }
        case QRStyle.STANDARD:
        default: {
            if (isVirtual) {
                return (_r, _c, x, y, _cx, _cy) => {
                    const intX = Math.round(x);
                    const intY = Math.round(y);
                    const intW = Math.round(x + cellSize) - intX;
                    const intH = Math.round(y + cellSize) - intY;
                    ctx.rect(intX, intY, intW, intH);
                };
            } else {
                const ceilCellSize = Math.ceil(cellSize);
                return (_r, _c, x, y, _cx, _cy) => ctx.rect(Math.floor(x), Math.floor(y), ceilCellSize, ceilCellSize);
            }
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
  isVirtual: boolean = false
) => {
    ctx.fillStyle = config.fgColor;
    const isCoveredByLogo = getIsCoveredByLogo(config, moduleCount, logoMetrics);
    
    ctx.beginPath();
    const drawModuleFn = getModuleDrawer(config.style, ctx, cellSize, modules, moduleCount, isCoveredByLogo, isVirtual);

    const cellSizeHalf = cellSize / 2;
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

    iterateMatrix(moduleCount, (r, c) => {
        if (modules.get(r, c)) {
            if (isCoveredByLogo(r, c)) return;

            const x = xs[c];
            const y = ys[r];
            const cx = cxs[c];
            const cy = cys[r];

            drawModuleFn(r, c, x, y, cx, cy);
        }
    });

    ctx.fill();
};
