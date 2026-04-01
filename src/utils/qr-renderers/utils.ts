import { QRConfig } from '../../types';

/**
 * Determines if a given module at (row, column) is part of the three corner
 * positioning squares (eyes) of the QR code grid.
 * @param r - The row index of the module.
 * @param c - The column index of the module.
 * @param moduleCount - The total number of modules (rows/columns) in the QR grid.
 * @returns True if the module is part of a corner eye, false otherwise.
 */
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

const SAFE_AREA_RATIOS: Record<string, number> = {
  L: 0.22,
  M: 0.35,
  Q: 0.45,
  H: 0.50,
};

/**
 * Calculates the effective sizes and padding for a central logo, dynamically scaling it
 * down if it exceeds the safe area ratio determined by the current error correction level
 * to ensure the QR code remains scannable.
 * @param config - The QR configuration containing logo settings.
 * @param moduleCount - The total number of modules in the QR grid.
 * @param cellSize - The physical size (in pixels) of a single module.
 * @returns The calculated metrics for rendering the logo and its cutout.
 */
export const getLogoMetrics = (config: QRConfig, moduleCount: number, cellSize: number): LogoMetrics => {
    // Determine safe limit for logo size
    const SAFE_AREA_RATIO = SAFE_AREA_RATIOS[config.errorCorrectionLevel] ?? 0.50;

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

/**
 * Returns a highly optimized predicate function (closure) used during the rendering loop
 * to quickly determine if a module is covered by the logo cutout. Supports both square
 * and circle padding styles.
 * @param config - The QR configuration containing logo style settings.
 * @param moduleCount - The total number of modules in the QR grid.
 * @param logoMetrics - Pre-calculated logo metrics (from `getLogoMetrics`).
 * @returns A predicate function taking (row, col) and returning true if covered.
 */
export const getIsCoveredByLogo = (config: QRConfig, moduleCount: number, logoMetrics: LogoMetrics) => {
    const center = moduleCount / 2;
    const { cutoutModuleSize } = logoMetrics;

    if (!config.logoUrl) {
      return () => false;
    }

    // Optimization: Pre-calculate metrics to avoid re-computation in the render loop
    const centerOffset = center - 0.5;

    if (config.logoPaddingStyle === 'circle') {
      const radius = cutoutModuleSize / 2;
      const radiusSq = radius * radius;
      return (r: number, c: number) => {
        const x = c - centerOffset;
        const y = r - centerOffset;
        return (x * x + y * y) < radiusSq;
      };
    } else {
      const halfSize = cutoutModuleSize / 2;
      const minBound = centerOffset - halfSize;
      const maxBound = centerOffset + halfSize;

      return (r: number, c: number) => {
        return c > minBound && c < maxBound && r > minBound && r < maxBound;
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

/**
 * Calculates the canvas layout metrics, adjusting the inner drawing area and starting
 * coordinates based on border configurations.
 * @param config - The QR configuration containing border settings.
 * @param displaySize - The total available size (in pixels) for the canvas.
 * @param moduleCount - The total number of modules in the QR grid.
 * @returns The metrics needed to correctly position and scale the QR grid.
 */
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
