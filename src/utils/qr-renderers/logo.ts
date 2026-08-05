import { QRConfig } from '../../types';
import { LogoMetrics } from './utils';
import { drawLogoBackground } from '../canvasHelpers';

export const renderLogo = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  logoImg: HTMLImageElement | null,
  displaySize: number,
  logoMetrics: LogoMetrics
) => {
    if (config.logoUrl && logoImg) {
        const { logoSizePx, logoPaddingPx } = logoMetrics;

        let dw = logoSizePx;
        let dh = logoSizePx;

        const imgWidth = logoImg.naturalWidth || logoImg.width || 0;
        const imgHeight = logoImg.naturalHeight || logoImg.height || 0;
        if (imgWidth > 0 && imgHeight > 0) {
            const aspectRatio = imgWidth / imgHeight;
            if (imgWidth >= imgHeight) {
                dh = logoSizePx / aspectRatio;
            } else {
                dw = logoSizePx * aspectRatio;
            }
        }

        const lx = (displaySize - dw) / 2;
        const ly = (displaySize - dh) / 2;

        if (config.logoPaddingStyle !== 'none') {
            const bgColor = config.logoBackgroundColor || config.bgColor;
            drawLogoBackground(
                ctx,
                displaySize,
                logoSizePx,
                logoPaddingPx,
                config.logoPaddingStyle,
                bgColor
            );
        }

        ctx.drawImage(logoImg, lx, ly, dw, dh);
    }
};
