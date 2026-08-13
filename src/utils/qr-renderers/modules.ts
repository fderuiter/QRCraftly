import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawRoughRect, drawPoly, drawStar, drawCircularModule, drawCircuitModule, drawStandardModule } from '../canvasHelpers';
import { getIsCoveredByLogo, LogoMetrics, iterateMatrix } from './utils';

type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

const getModuleDrawer = (
    style: QRStyle,
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    modules: QRModules,
    moduleCount: number,
    isCoveredByLogo: (r: number, c: number) => boolean,
    isVirtual: boolean,
    isCompensationEnabled: boolean = false
): DrawModuleFn => {
    switch(style) {
        case QRStyle.MODERN: {
            const rModern = cellSize * 0.3;
            return (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, rModern);
        }
        case QRStyle.SWISS: {
            const scale = isCompensationEnabled ? 1.45 : 1.05;
            return (_r, _c, _x, _y, cx, cy) => drawCircularModule(ctx, cx, cy, cellSize, scale);
        }
        case QRStyle.FLUID: {
            return (_r, _c, _x, _y, cx, cy) => drawCircularModule(ctx, cx, cy, cellSize, 1.1);
        }
        case QRStyle.CIRCUIT: {
            const validGrid = new Uint8Array(moduleCount * moduleCount);

            iterateMatrix(moduleCount, (r, c) => {
                if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
                    validGrid[r * moduleCount + c] = 1;
                }
            });

            return (r, c, x, y, cx, cy) => {
                const idx = r * moduleCount + c;
                const hasTop = r > 0 && validGrid[idx - moduleCount] === 1;
                const hasBottom = r < moduleCount-1 && validGrid[idx + moduleCount] === 1;
                const hasLeft = c > 0 && validGrid[idx - 1] === 1;
                const hasRight = c < moduleCount-1 && validGrid[idx + 1] === 1;

                drawCircuitModule(ctx, x, y, cx, cy, cellSize, hasTop, hasBottom, hasLeft, hasRight);
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
            const innerR = isCompensationEnabled ? cellSize / 1.6 : cellSize / 2.2;
            return (_r, _c, _x, _y, cx, cy) => drawStar(ctx, cx, cy, outerR, innerR, 5, false, true);
        }
        case QRStyle.STANDARD:
        default: {
            return (_r, _c, x, y, _cx, _cy) => drawStandardModule(ctx, x, y, cellSize, isVirtual);
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
    const drawModuleFn = getModuleDrawer(
        config.style,
        ctx,
        cellSize,
        modules,
        moduleCount,
        isCoveredByLogo,
        isVirtual,
        config.isCompensationEnabled
    );

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
