import { QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect } from '../canvasHelpers';
import { isEye } from './utils';

export type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

export type ModuleDrawerFactory = (
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    modules: QRModules,
    moduleCount: number,
    isCoveredByLogo: (r: number, c: number) => boolean
) => DrawModuleFn;

export const MODULE_DRAWERS: Record<QRStyle, ModuleDrawerFactory> = {
    [QRStyle.MODERN]: (ctx, cellSize) => {
        return (_r, _c, x, y, _cx, _cy) => drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.3);
    },
    [QRStyle.SWISS]: (ctx, cellSize) => {
        return (_r, _c, _x, _y, cx, cy) => {
            ctx.moveTo(cx + (cellSize / 2 * 1.05), cy);
            ctx.arc(cx, cy, cellSize / 2 * 1.05, 0, Math.PI * 2);
        };
    },
    [QRStyle.FLUID]: (ctx, cellSize) => {
        return (_r, _c, _x, _y, cx, cy) => {
            ctx.moveTo(cx + (cellSize / 2 * 1.1), cy);
            ctx.arc(cx, cy, cellSize / 2 * 1.1, 0, Math.PI * 2);
        };
    },
    [QRStyle.CIRCUIT]: (ctx, cellSize, modules, moduleCount, isCoveredByLogo) => {
        return (r, c, x, y, cx, cy) => {
            const hasTop = r > 0 && modules.get(r - 1, c) && !isCoveredByLogo(r - 1, c) && !isEye(r - 1, c, moduleCount);
            const hasBottom = r < moduleCount - 1 && modules.get(r + 1, c) && !isCoveredByLogo(r + 1, c) && !isEye(r + 1, c, moduleCount);
            const hasLeft = c > 0 && modules.get(r, c - 1) && !isCoveredByLogo(r, c - 1) && !isEye(r, c - 1, moduleCount);
            const hasRight = c < moduleCount - 1 && modules.get(r, c + 1) && !isCoveredByLogo(r, c + 1) && !isEye(r, c + 1, moduleCount);

            // Full square with very tiny notches
            drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);

            // Draw lines to neighbors
            const thickness = cellSize * 0.4;
            if (hasRight) ctx.rect(cx, cy - thickness / 2, cellSize / 2 + 1, thickness);
            if (hasBottom) ctx.rect(cx - thickness / 2, cy, thickness, cellSize / 2 + 1);
            if (hasLeft) ctx.rect(x, cy - thickness / 2, cellSize / 2 + 1, thickness);
            if (hasTop) ctx.rect(cx - thickness / 2, y, thickness, cellSize / 2 + 1);
        };
    },
    [QRStyle.HIVE]: (ctx, cellSize) => {
        return (_r, _c, _x, _y, cx, cy) => drawPoly(ctx, cx, cy, cellSize / 1.55, 6, 0, true, true);
    },
    [QRStyle.GRUNGE]: (ctx, cellSize) => {
        return (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
    },
    [QRStyle.STARBURST]: (ctx, cellSize) => {
        return (_r, _c, _x, _y, cx, cy) => drawStar(ctx, cx, cy, cellSize / 1.5, cellSize / 2.2, 5, true, true);
    },
    [QRStyle.STANDARD]: (ctx, cellSize) => {
        return (_r, _c, x, y, _cx, _cy) => ctx.rect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
    },
};
