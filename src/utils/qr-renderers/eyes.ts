import { QRConfig, QRStyle } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from '../canvasHelpers';

export const renderEyes = (
    ctx: CanvasRenderingContext2D,
    config: QRConfig,
    drawX: number,
    drawY: number,
    cellSize: number,
    moduleCount: number
) => {
    // Helper to punch hole with bgColor
    const clearShape = (drawFn: () => void) => {
        ctx.fillStyle = config.bgColor;
        drawFn();
        ctx.fillStyle = config.eyeColor; // Restore
    };

    const drawEyePattern = (r: number, c: number) => {
        const x = drawX + c * cellSize;
        const y = drawY + r * cellSize;
        const size = 7 * cellSize;

        ctx.fillStyle = config.eyeColor;

        const cx = x + size / 2;
        const cy = y + size / 2;

        const drawRoundedEyeFrame = () => {
             // Frame (Less rounded for robustness)
             ctx.beginPath();
             drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
             ctx.fill();
             // Hole
             clearShape(() => {
                  ctx.beginPath();
                  drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
                  ctx.fill();
             });
        };

        const drawSquareEyeFrame = () => {
             // Frame: Standard Square
             ctx.fillRect(x, y, size, size);

             clearShape(() => {
                 // Standard Hole
                 ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
             });
        };

        switch (config.style) {
            case QRStyle.MODERN: // Rounded Squares
                drawRoundedEyeFrame();

                // Eyeball (Solid Square with slight rounding)
                ctx.beginPath();
                drawRoundRect(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize, cellSize * 0.5);
                ctx.fill();
                break;

            case QRStyle.SWISS: // Swiss Dot
                drawRoundedEyeFrame();

                // Eyeball: Floating Dot (Circular)
                ctx.beginPath();
                // Standard Radius 1.5 (Diameter 3)
                ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                ctx.fill();
                break;

            case QRStyle.FLUID: // Fluid
                // COPY OF SWISS (Proven to pass)
                drawRoundedEyeFrame();

                // Eyeball: Circular (Same as Swiss)
                ctx.beginPath();
                ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                ctx.fill();
                break;

            case QRStyle.CIRCUIT: // Cyber-Circuit (Brackets + Notched)
                 drawSquareEyeFrame();

                 // Simulate brackets by drawing small white lines over the frame
                 ctx.fillStyle = config.bgColor;
                 const gap = cellSize * 0.5;
                 ctx.fillRect(cx - gap/2, y, gap, cellSize * 1.1); // Top cut
                 ctx.fillRect(cx - gap/2, y + size - cellSize*1.1, gap, cellSize*1.1); // Bottom cut
                 ctx.fillRect(x, cy - gap/2, cellSize * 1.1, gap); // Left cut
                 ctx.fillRect(x + size - cellSize*1.1, cy - gap/2, cellSize * 1.1, gap); // Right cut
                 ctx.fillStyle = config.eyeColor;

                 // Eyeball: Notched Square
                 ctx.beginPath();
                 // Standard 3x3 square
                 ctx.rect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                 ctx.fill();
                 // Add slight notch via clearing
                 clearShape(() => {
                    ctx.fillRect(x + 4.6*cellSize, y + 4.6*cellSize, 0.4*cellSize, 0.4*cellSize);
                 });
                 break;

            case QRStyle.HIVE: // Hexagon
                drawSquareEyeFrame();

                // Eyeball: Solid Hex (This is fine usually if large enough)
                drawPoly(ctx, cx, cy, 1.8 * cellSize, 6, 0, true);
                break;

            case QRStyle.GRUNGE: // Grunge
                // Frame
                drawRoughRect(ctx, x, y, size, size);

                clearShape(() => {
                    ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                });

                // Eyeball - Solid rough polygon
                drawScribble(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize);
                break;

            case QRStyle.STARBURST:
                 drawSquareEyeFrame();

                 // Eyeball: Star
                 // Make it fat
                 drawStar(ctx, cx, cy, 1.9*cellSize, 1.2*cellSize, 5, true);
                 break;

            case QRStyle.STANDARD:
            default:
                // Standard
                ctx.fillRect(x, y, size, size);
                clearShape(() => {
                     ctx.clearRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                     ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                });
                ctx.fillRect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                break;
        }
    };

    // Draw Eyes (Last to ensure they overlap nicely if needed)
    drawEyePattern(0, 0);
    drawEyePattern(0, moduleCount - 7);
    drawEyePattern(moduleCount - 7, 0);
};
