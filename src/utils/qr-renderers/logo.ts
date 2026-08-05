import { QRConfig, QRDrawingContext } from '../../types';
import { LogoMetrics } from './utils';

export const renderLogo = (
  ctx: QRDrawingContext,
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
            ctx.fillStyle = config.logoBackgroundColor || config.bgColor;
            if (config.logoPaddingStyle === 'circle') {
                ctx.beginPath();
                const radius = (logoSizePx / 2) + logoPaddingPx;
                ctx.arc(displaySize/2, displaySize/2, radius, 0, Math.PI*2);
                ctx.fill();
            } else {
                const padding = logoPaddingPx;
                ctx.fillRect(lx - padding, ly - padding, logoSizePx + (padding*2), logoSizePx + (padding*2));
            }
        }

        ctx.drawImage(logoImg, lx, ly, logoSizePx, logoSizePx);
    }
};
