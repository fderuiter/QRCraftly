import { QRConfig, QRStyle, QRModules } from '../../types';
import { getIsCoveredByLogo, LogoMetrics } from './utils';
import { MODULE_DRAWERS } from './moduleDrawers';

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

    const drawerFactory = MODULE_DRAWERS[config.style] || MODULE_DRAWERS[QRStyle.STANDARD];
    const drawModuleFn = drawerFactory(ctx, cellSize, modules, moduleCount, isCoveredByLogo);

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
