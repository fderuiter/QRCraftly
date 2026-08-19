import { QRConfig } from '../../types';
import { drawEyeFrame, drawEyeball } from '../canvasHelpers';
import { ModuleRenderOptions, sampleCellLuminances } from './modules';
import { getLuminance } from '../colorUtils';

export const renderEyes = (
    ctx: CanvasRenderingContext2D,
    config: QRConfig,
    drawX: number,
    drawY: number,
    cellSize: number,
    moduleCount: number,
    options?: ModuleRenderOptions
) => {
    let cellLuminance = options?.cellLuminance || null;
    if (!cellLuminance && options?.bgImageData) {
        cellLuminance = sampleCellLuminances(options.bgImageData, moduleCount, drawX, drawY, cellSize);
    }

    const threshold = options?.luminanceThreshold ?? config.luminanceThreshold ?? 0.25;

    let fgColorDark = options?.fgColorDark || config.fgColorDark || config.eyeColor || config.fgColor;
    let fgColorLight = options?.fgColorLight || config.fgColorLight || '#ffffff';

    if (!options?.fgColorDark && !config.fgColorDark) {
        const defaultDarkLum = getLuminance(fgColorDark);
        if ((1.0 + 0.05) / (defaultDarkLum + 0.05) < 3.0) {
            fgColorDark = '#000000';
        }
    }

    if (!options?.fgColorLight && !config.fgColorLight) {
        const defaultLightLum = getLuminance(fgColorLight);
        if ((defaultLightLum + 0.05) / (0.0 + 0.05) < 3.0) {
            fgColorLight = '#ffffff';
        }
    }

    const drawEyePattern = (r: number, c: number) => {
        const x = drawX + c * cellSize;
        const y = drawY + r * cellSize;
        const size = 7 * cellSize;

        let eyeColor = config.eyeColor;
        let holeColor = config.bgColor;

        if (cellLuminance || config.isLuminanceMaskingEnabled) {
            let totalLum = 0;
            let count = 0;
            for (let er = r; er < r + 7 && er < moduleCount; er++) {
                for (let ec = c; ec < c + 7 && ec < moduleCount; ec++) {
                    const idx = er * moduleCount + ec;
                    totalLum += cellLuminance ? cellLuminance[idx] : 1.0;
                    count++;
                }
            }
            const avgLum = count > 0 ? totalLum / count : 1.0;
            if (avgLum < threshold) {
                eyeColor = fgColorLight;
                holeColor = '#000000';
            } else {
                eyeColor = fgColorDark;
                holeColor = '#ffffff';
            }
        }

        drawEyeFrame(
            ctx,
            x,
            y,
            size,
            cellSize,
            config.style,
            eyeColor,
            holeColor
        );

        drawEyeball(
            ctx,
            x,
            y,
            size,
            cellSize,
            config.style,
            eyeColor,
            holeColor
        );
    };

    // Draw Eyes (Last to ensure they overlap nicely if needed)
    drawEyePattern(0, 0);
    drawEyePattern(0, moduleCount - 7);
    drawEyePattern(moduleCount - 7, 0);
};
