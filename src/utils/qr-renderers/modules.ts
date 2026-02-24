import { QRConfig, QRStyle, QRModules } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect } from '../canvasHelpers';
import { isEye, getIsCoveredByLogo, LogoMetrics } from './utils';

type DrawModuleFn = (r: number, c: number, x: number, y: number, cx: number, cy: number) => void;

const getModuleDrawer = (
    style: QRStyle,
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    renderable: Uint8Array,
    moduleCount: number
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
                // Use renderable map for neighbor checks
                // renderable uses index r * moduleCount + c
                const idx = r * moduleCount + c;

                // Check neighbors using the pre-calculated map
                // Boundary checks are handled by r > 0, etc.
                const hasTop = r > 0 && renderable[idx - moduleCount];
                const hasBottom = r < moduleCount - 1 && renderable[idx + moduleCount];
                const hasLeft = c > 0 && renderable[idx - 1];
                const hasRight = c < moduleCount - 1 && renderable[idx + 1];

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

    // 1. Build renderable map (Pass 1)
    // 0 = not renderable (off, covered, or eye)
    // 1 = renderable
    const renderable = new Uint8Array(moduleCount * moduleCount);

    const markRenderable = (r: number, c: number) => {
        if (modules.get(r, c) && !isCoveredByLogo(r, c)) {
             renderable[r * moduleCount + c] = 1;
        }
    };

    // Use the same split loop strategy to avoid explicit isEye checks during population
    // Top Section (Rows 0-6): Skip TL (0-6) and TR (size-7 to size-1)
    for (let r = 0; r < 7; r++) {
        for (let c = 7; c < moduleCount - 7; c++) {
            markRenderable(r, c);
        }
    }

    // Middle Section (Rows 7 to size-8): No eyes
    for (let r = 7; r < moduleCount - 7; r++) {
        for (let c = 0; c < moduleCount; c++) {
            markRenderable(r, c);
        }
    }

    // Bottom Section (Rows size-7 to size-1): Skip BL (0-6)
    for (let r = moduleCount - 7; r < moduleCount; r++) {
        for (let c = 7; c < moduleCount; c++) {
            markRenderable(r, c);
        }
    }

    // Batch drawing for performance
    ctx.beginPath();

    const drawModuleFn = getModuleDrawer(config.style, ctx, cellSize, renderable, moduleCount);

    const drawRenderableAt = (r: number, c: number) => {
        // Use pre-calculated map
        if (renderable[r * moduleCount + c]) {
            const x = drawX + c * cellSize;
            const y = drawY + r * cellSize;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;

            drawModuleFn(r, c, x, y, cx, cy);
        }
    };

    // 2. Draw (Pass 2)
    // Iterate same loops to draw
    // Top Section
    for (let r = 0; r < 7; r++) {
        for (let c = 7; c < moduleCount - 7; c++) {
            drawRenderableAt(r, c);
        }
    }

    // Middle Section
    for (let r = 7; r < moduleCount - 7; r++) {
        for (let c = 0; c < moduleCount; c++) {
            drawRenderableAt(r, c);
        }
    }

    // Bottom Section
    for (let r = moduleCount - 7; r < moduleCount; r++) {
        for (let c = 7; c < moduleCount; c++) {
            drawRenderableAt(r, c);
        }
    }

    ctx.fill();
};
