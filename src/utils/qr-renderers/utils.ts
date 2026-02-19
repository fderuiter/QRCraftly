import { QRConfig } from '../../types';

export const isEye = (r: number, c: number, moduleCount: number): boolean => {
  if (r < 7 && c < 7) return true;
  if (r < 7 && c >= moduleCount - 7) return true;
  if (r >= moduleCount - 7 && c < 7) return true;
  return false;
};

export interface LogoMetrics {
  logoSizePx: number;
  logoPaddingPx: number;
  cutoutModuleSize: number;
  effectiveLogoSizeModules: number;
  effectivePaddingModules: number;
}

export const getLogoMetrics = (config: QRConfig, moduleCount: number, cellSize: number): LogoMetrics => {
    // Determine safe limit for logo size
    const SAFE_AREA_RATIO = (() => {
       switch(config.errorCorrectionLevel) {
           case 'L': return 0.22;
           case 'M': return 0.35;
           case 'Q': return 0.45;
           case 'H': default: return 0.50;
       }
    })();

    const requestedLogoSizeModules = config.logoSize * moduleCount;
    const paddingModules = config.logoPaddingStyle === 'none' ? 0 : config.logoPadding;
    const requestedCutoutModules = requestedLogoSizeModules + (paddingModules * 2);

    let effectiveLogoSizeModules = requestedLogoSizeModules;
    let effectivePaddingModules = paddingModules;

    if (requestedCutoutModules > moduleCount * SAFE_AREA_RATIO) {
        const maxCutoutModules = moduleCount * SAFE_AREA_RATIO;
        const scaleFactor = maxCutoutModules / requestedCutoutModules;
        effectiveLogoSizeModules = requestedLogoSizeModules * scaleFactor;
        effectivePaddingModules = paddingModules * scaleFactor;
    }

    const logoSizePx = effectiveLogoSizeModules * cellSize;
    const logoPaddingPx = effectivePaddingModules * cellSize;
    const cutoutModuleSize = effectiveLogoSizeModules + (effectivePaddingModules * 2);

    return {
        logoSizePx,
        logoPaddingPx,
        cutoutModuleSize,
        effectiveLogoSizeModules,
        effectivePaddingModules
    };
};

export const getIsCoveredByLogo = (config: QRConfig, moduleCount: number, logoMetrics: LogoMetrics) => {
    if (!config.logoUrl) return () => false;

    // Optimization: Lift constant calculations out of the returned closure (hot path).
    // This avoids recalculating center, halfSize, radiusSquared and checking config style for every module.
    // Since this is called N^2 times (e.g. 30k+ for V40), this reduces overhead significantly.
    const center = moduleCount / 2;
    const { cutoutModuleSize } = logoMetrics;
    const halfSize = cutoutModuleSize / 2;
    const radiusSquared = halfSize * halfSize;

    if (config.logoPaddingStyle === 'circle') {
        return (r: number, c: number) => {
            const x = c - center + 0.5;
            const y = r - center + 0.5;
            return (x * x + y * y) < radiusSquared;
        };
    } else {
        // Square or none (uses square bounds)
        return (r: number, c: number) => {
             const x = c - center + 0.5;
             const y = r - center + 0.5;
             return Math.abs(x) < halfSize && Math.abs(y) < halfSize;
        };
    }
};

export interface LayoutMetrics {
    drawX: number;
    drawY: number;
    drawSize: number;
    cellSize: number;
    borderPx: number;
}

export const calculateLayout = (config: QRConfig, displaySize: number, moduleCount: number): LayoutMetrics => {
    let drawX = 0;
    let drawY = 0;
    let drawSize = displaySize;
    let borderPx = 0;

    if (config.isBorderEnabled && config.borderSize > 0) {
        borderPx = displaySize * config.borderSize;
        drawX = borderPx;
        drawY = borderPx;
        drawSize = displaySize - (borderPx * 2);
    }

    const cellSize = drawSize / moduleCount;

    return { drawX, drawY, drawSize, cellSize, borderPx };
};
