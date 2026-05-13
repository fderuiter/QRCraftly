import { QRConfig, QRStyle } from '../../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from '../canvasHelpers';

export interface EyeRenderContext {
    ctx: CanvasRenderingContext2D;
    config: QRConfig;
    x: number;
    y: number;
    cx: number;
    cy: number;
    size: number;
    cellSize: number;
    clearShape: (drawFn: () => void) => void;
}

type EyeRenderer = (ctxArgs: EyeRenderContext) => void;

const drawRoundedEyeFrame = ({ ctx, x, y, size, cellSize, clearShape }: EyeRenderContext) => {
    ctx.beginPath();
    drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
    ctx.fill();
    clearShape(() => {
        ctx.beginPath();
        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
        ctx.fill();
    });
};

const drawSquareEyeFrame = ({ ctx, x, y, size, cellSize, clearShape }: EyeRenderContext) => {
    ctx.fillRect(x, y, size, size);
    clearShape(() => {
        ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
    });
};

const eyeRenderers: Record<QRStyle, EyeRenderer> = {
    [QRStyle.MODERN]: (ctxArgs) => {
        drawRoundedEyeFrame(ctxArgs);
        ctxArgs.ctx.beginPath();
        drawRoundRect(ctxArgs.ctx, ctxArgs.x + 2*ctxArgs.cellSize, ctxArgs.y + 2*ctxArgs.cellSize, 3*ctxArgs.cellSize, 3*ctxArgs.cellSize, ctxArgs.cellSize * 0.5);
        ctxArgs.ctx.fill();
    },
    [QRStyle.SWISS]: (ctxArgs) => {
        drawRoundedEyeFrame(ctxArgs);
        ctxArgs.ctx.beginPath();
        ctxArgs.ctx.arc(ctxArgs.cx, ctxArgs.cy, 1.5 * ctxArgs.cellSize, 0, Math.PI * 2);
        ctxArgs.ctx.fill();
    },
    [QRStyle.FLUID]: (ctxArgs) => {
        drawRoundedEyeFrame(ctxArgs);
        ctxArgs.ctx.beginPath();
        ctxArgs.ctx.arc(ctxArgs.cx, ctxArgs.cy, 1.5 * ctxArgs.cellSize, 0, Math.PI * 2);
        ctxArgs.ctx.fill();
    },
    [QRStyle.CIRCUIT]: (ctxArgs) => {
        drawSquareEyeFrame(ctxArgs);
        ctxArgs.ctx.fillStyle = ctxArgs.config.bgColor;
        const gap = ctxArgs.cellSize * 0.5;
        ctxArgs.ctx.fillRect(ctxArgs.cx - gap/2, ctxArgs.y, gap, ctxArgs.cellSize * 1.1);
        ctxArgs.ctx.fillRect(ctxArgs.cx - gap/2, ctxArgs.y + ctxArgs.size - ctxArgs.cellSize*1.1, gap, ctxArgs.cellSize*1.1);
        ctxArgs.ctx.fillRect(ctxArgs.x, ctxArgs.cy - gap/2, ctxArgs.cellSize * 1.1, gap);
        ctxArgs.ctx.fillRect(ctxArgs.x + ctxArgs.size - ctxArgs.cellSize*1.1, ctxArgs.cy - gap/2, ctxArgs.cellSize * 1.1, gap);
        ctxArgs.ctx.fillStyle = ctxArgs.config.eyeColor;

        ctxArgs.ctx.beginPath();
        ctxArgs.ctx.rect(ctxArgs.x + 2*ctxArgs.cellSize, ctxArgs.y + 2*ctxArgs.cellSize, 3*ctxArgs.cellSize, 3*ctxArgs.cellSize);
        ctxArgs.ctx.fill();
        ctxArgs.clearShape(() => {
            ctxArgs.ctx.fillRect(ctxArgs.x + 4.6*ctxArgs.cellSize, ctxArgs.y + 4.6*ctxArgs.cellSize, 0.4*ctxArgs.cellSize, 0.4*ctxArgs.cellSize);
        });
    },
    [QRStyle.HIVE]: (ctxArgs) => {
        drawSquareEyeFrame(ctxArgs);
        drawPoly(ctxArgs.ctx, ctxArgs.cx, ctxArgs.cy, 1.8 * ctxArgs.cellSize, 6, 0, true);
    },
    [QRStyle.GRUNGE]: (ctxArgs) => {
        drawRoughRect(ctxArgs.ctx, ctxArgs.x, ctxArgs.y, ctxArgs.size, ctxArgs.size);
        ctxArgs.clearShape(() => {
            ctxArgs.ctx.fillRect(ctxArgs.x + ctxArgs.cellSize, ctxArgs.y + ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize);
        });
        drawScribble(ctxArgs.ctx, ctxArgs.x + 2*ctxArgs.cellSize, ctxArgs.y + 2*ctxArgs.cellSize, 3*ctxArgs.cellSize);
    },
    [QRStyle.STARBURST]: (ctxArgs) => {
        drawSquareEyeFrame(ctxArgs);
        drawStar(ctxArgs.ctx, ctxArgs.cx, ctxArgs.cy, 1.9*ctxArgs.cellSize, 1.2*ctxArgs.cellSize, 5, true);
    },
    [QRStyle.STANDARD]: (ctxArgs) => {
        ctxArgs.ctx.fillRect(ctxArgs.x, ctxArgs.y, ctxArgs.size, ctxArgs.size);
        ctxArgs.clearShape(() => {
            ctxArgs.ctx.clearRect(ctxArgs.x + ctxArgs.cellSize, ctxArgs.y + ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize);
            ctxArgs.ctx.fillRect(ctxArgs.x + ctxArgs.cellSize, ctxArgs.y + ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize, ctxArgs.size - 2*ctxArgs.cellSize);
        });
        ctxArgs.ctx.fillRect(ctxArgs.x + 2*ctxArgs.cellSize, ctxArgs.y + 2*ctxArgs.cellSize, 3*ctxArgs.cellSize, 3*ctxArgs.cellSize);
    }
};

export const renderEyes = (
    ctx: CanvasRenderingContext2D,
    config: QRConfig,
    drawX: number,
    drawY: number,
    cellSize: number,
    moduleCount: number
) => {
    const clearShape = (drawFn: () => void) => {
        ctx.fillStyle = config.bgColor;
        drawFn();
        ctx.fillStyle = config.eyeColor;
    };

    const drawEyePattern = (r: number, c: number) => {
        const x = drawX + c * cellSize;
        const y = drawY + r * cellSize;
        const size = 7 * cellSize;

        ctx.fillStyle = config.eyeColor;

        const cx = x + size / 2;
        const cy = y + size / 2;

        const ctxArgs: EyeRenderContext = { ctx, config, x, y, cx, cy, size, cellSize, clearShape };
        const renderer = eyeRenderers[config.style] || eyeRenderers[QRStyle.STANDARD];
        renderer(ctxArgs);
    };

    drawEyePattern(0, 0);
    drawEyePattern(0, moduleCount - 7);
    drawEyePattern(moduleCount - 7, 0);
};
