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
        case QRStyle.CIRCUIT: {
            // Pre-calculate valid modules for CIRCUIT style to avoid repeated expensive checks
            // (isCoveredByLogo and isEye) for every neighbor of every module.
            const validGrid = new Uint8Array(moduleCount * moduleCount);
            for (let r = 0; r < moduleCount; r++) {
                for (let c = 0; c < moduleCount; c++) {
                    if (modules.get(r, c) && !isEye(r, c, moduleCount) && !isCoveredByLogo(r, c)) {
                        validGrid[r * moduleCount + c] = 1;
                    }
                }
            }
            return (r, c, x, y, cx, cy) => {
                const hasTop = r > 0 && validGrid[(r-1) * moduleCount + c];
                const hasBottom = r < moduleCount-1 && validGrid[(r+1) * moduleCount + c];
                const hasLeft = c > 0 && validGrid[r * moduleCount + (c-1)];
                const hasRight = c < moduleCount-1 && validGrid[r * moduleCount + (c+1)];

                // Full square with very tiny notches
                drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);

                // Draw lines to neighbors
                const thickness = cellSize * 0.4;
                if (hasRight) ctx.rect(cx, cy - thickness/2, cellSize/2 + 1, thickness);
                if (hasBottom) ctx.rect(cx - thickness/2, cy, thickness, cellSize/2 + 1);
                if (hasLeft) ctx.rect(x, cy - thickness/2, cellSize/2 + 1, thickness);
                if (hasTop) ctx.rect(cx - thickness/2, y, thickness, cellSize/2 + 1);
            };
        }
        case QRStyle.HIVE: {
            // Pre-calculate hexagon offsets to avoid Math.cos/sin in the hot loop
            const rHive = cellSize / 1.55;
            const sidesHive = 6;
            const offsetsHive = Array.from({ length: sidesHive }, (_, i) => {
                const theta = (i * 2 * Math.PI) / sidesHive;
                return { x: rHive * Math.cos(theta), y: rHive * Math.sin(theta) };
            });
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx + offsetsHive[0].x, cy + offsetsHive[0].y);
                for (let i = 1; i < sidesHive; i++) {
                    ctx.lineTo(cx + offsetsHive[i].x, cy + offsetsHive[i].y);
                }
                ctx.closePath();
            };
        }
        case QRStyle.GRUNGE:
            return (_r, _c, x, y, _cx, _cy) => drawRoughRect(ctx, x, y, cellSize, cellSize, true);
        case QRStyle.STARBURST: {
            // Pre-calculate starburst offsets to avoid Math.cos/sin in the hot loop
            const outerR = cellSize / 1.5;
            const innerR = cellSize / 2.2;
            const spikes = 5;
            const step = Math.PI / spikes;
            const offsetsStar: {x: number, y: number}[] = [];
            let rot = Math.PI / 2 * 3;
            for (let i = 0; i < spikes; i++) {
                offsetsStar.push({ x: Math.cos(rot) * outerR, y: Math.sin(rot) * outerR });
                rot += step;
                offsetsStar.push({ x: Math.cos(rot) * innerR, y: Math.sin(rot) * innerR });
                rot += step;
            }
            return (_r, _c, _x, _y, cx, cy) => {
                ctx.moveTo(cx, cy - outerR);
                for (let i = 0; i < offsetsStar.length; i++) {
                    ctx.lineTo(cx + offsetsStar[i].x, cy + offsetsStar[i].y);
                }
                ctx.lineTo(cx, cy - outerR);
                ctx.closePath();
            };
        }
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

    const drawModuleAt = (r: number, c: number) => {
        if (modules.get(r, c)) {
            if (isCoveredByLogo(r, c)) return;

            const x = drawX + c * cellSize;
            const y = drawY + r * cellSize;
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;

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
