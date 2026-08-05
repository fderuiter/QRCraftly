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
        const lx = (displaySize - logoSizePx) / 2;
        const ly = (displaySize - logoSizePx) / 2;

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

        ctx.drawImage(logoImg, lx, ly, logoSizePx, logoSizePx);
    }
};
