import { QRConfig } from '../../types';
import { drawEyeFrame, drawEyeball } from '../canvasHelpers';

export const renderEyes = (
    ctx: CanvasRenderingContext2D,
    config: QRConfig,
    drawX: number,
    drawY: number,
    cellSize: number,
    moduleCount: number
) => {
    const drawEyePattern = (r: number, c: number) => {
        const x = drawX + c * cellSize;
        const y = drawY + r * cellSize;
        const size = 7 * cellSize;

        drawEyeFrame(
            ctx,
            x,
            y,
            size,
            cellSize,
            config.style,
            config.eyeColor,
            config.bgColor
        );

        drawEyeball(
            ctx,
            x,
            y,
            size,
            cellSize,
            config.style,
            config.eyeColor,
            config.bgColor
        );
    };

    // Draw Eyes (Last to ensure they overlap nicely if needed)
    drawEyePattern(0, 0);
    drawEyePattern(0, moduleCount - 7);
    drawEyePattern(moduleCount - 7, 0);
};
