import { QRConfig } from '../../types';

/**
 * Draws the background and pattern (such as dashed or dotted) of the outer border.
 *
 * @param ctx - The canvas 2D rendering context.
 * @param config - The QR configuration object specifying border style and colors.
 * @param displaySize - The total size of the QR code canvas.
 * @param borderPx - The thickness of the border in pixels.
 */
export const renderBorder = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  displaySize: number,
  borderPx: number
) => {
    // Draw Border Background
    ctx.fillStyle = config.borderColor;
    ctx.fillRect(0, 0, displaySize, displaySize);

    // Draw Patterns based on style
    if (config.borderStyle === 'dashed' || config.borderStyle === 'dotted') {
        ctx.strokeStyle = config.bgColor; // Use background color for contrast
        ctx.lineWidth = borderPx * 0.2;
        if (config.borderStyle === 'dashed') {
            ctx.setLineDash([borderPx * 0.5, borderPx * 0.5]);
        } else {
            ctx.setLineDash([borderPx * 0.2, borderPx * 0.2]); // Dotted
        }
        ctx.strokeRect(borderPx * 0.5, borderPx * 0.5, displaySize - borderPx, displaySize - borderPx);
        ctx.setLineDash([]); // Reset
    } else if (config.borderStyle === 'double') {
        ctx.strokeStyle = config.bgColor;
        ctx.lineWidth = borderPx * 0.15;
        const offset = borderPx * 0.3;
        ctx.strokeRect(offset, offset, displaySize - offset * 2, displaySize - offset * 2);
    }
};

export const renderBorderDecoration = (
    ctx: CanvasRenderingContext2D,
    config: QRConfig,
    displaySize: number,
    borderPx: number,
    borderLogoImg: HTMLImageElement | null
) => {
    if (config.borderText) {
        ctx.fillStyle = config.borderTextColor;
        const fontSize = borderPx * 0.4;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let tx = displaySize / 2;
        let ty = borderPx / 2;

        if (config.borderTextPosition === 'bottom-center') {
            ty = displaySize - (borderPx / 2);
        } else if (config.borderTextPosition === 'top-center') {
            ty = borderPx / 2;
        }
        const maxWidth = displaySize * 0.9;
        ctx.fillText(config.borderText, tx, ty, maxWidth);
    }

    if (config.borderLogoUrl && borderLogoImg) {
        const blSize = borderPx * 0.8;
        let blx = (displaySize - blSize) / 2;
        let bly = displaySize - borderPx + (borderPx - blSize) / 2;

        if (config.borderLogoPosition === 'bottom-center') {
            blx = (displaySize - blSize) / 2;
            bly = displaySize - borderPx + (borderPx - blSize) / 2;
        } else if (config.borderLogoPosition === 'bottom-right') {
            blx = displaySize - borderPx - blSize;
            bly = displaySize - borderPx + (borderPx - blSize) / 2;
        }
        ctx.drawImage(borderLogoImg, blx, bly, blSize, blSize);
    }
};
