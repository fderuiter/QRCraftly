import { QRConfig } from '../../types';

export interface LogoMetrics {
  logoSizePx: number;
  logoPaddingPx: number;
  cutoutModuleSize: number;
  effectiveLogoSizeModules: number;
  effectivePaddingModules: number;
}

/**
 * Defines the maximum percentage of the total QR code area that can safely be obscured
 * by a central logo for each Error Correction Level (L, M, Q, H).
 *
 * These 'magic numbers' are scaled-up derivations of the standard Reed-Solomon capacities
 * (L: 7%, M: 15%, Q: 25%, H: 30%). They are higher than the standard capacities because
 * central logos obscure the redundant data region rather than the critical timing
 * patterns or corner positioning squares (eyes), allowing for a larger safe area limit
 * before structural damage prevents scanning.
 */
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

      const xsSq = new Float64Array(moduleCount);
      for (let c = 0; c < moduleCount; c++) {
        const x = c - centerOffset;
        xsSq[c] = x * x;
      }

      const ysSq = new Float64Array(moduleCount);
      for (let r = 0; r < moduleCount; r++) {
        const y = r - centerOffset;
        ysSq[r] = y * y;
      }

      return (r: number, c: number) => {
        return (xsSq[c] + ysSq[r]) < radiusSq;
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

export const iterateMatrix = (moduleCount: number, callback: (r: number, c: number) => void) => {
  // Top Section (Rows 0-6): Skip TL (0-6) and TR (size-7 to size-1)
  for (let r = 0; r < 7; r++) {
      for (let c = 7; c < moduleCount - 7; c++) {
          callback(r, c);
      }
  }

  // Middle Section (Rows 7 to size-8): No eyes
  for (let r = 7; r < moduleCount - 7; r++) {
      for (let c = 0; c < moduleCount; c++) {
          callback(r, c);
      }
  }

  // Bottom Section (Rows size-7 to size-1): Skip BL (0-6)
  for (let r = moduleCount - 7; r < moduleCount; r++) {
      for (let c = 7; c < moduleCount; c++) {
          callback(r, c);
      }
  }
};

interface LayoutMetrics {
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
    let borderPx = 0;

    if (config.isBorderEnabled && config.borderSize > 0) {
        borderPx = displaySize * config.borderSize;
    }

    // Enforce 4-module quiet zone floor
    const minBorderPx = (4 * displaySize) / (moduleCount + 8);
    if (borderPx < minBorderPx) {
        borderPx = minBorderPx;
    }

    const drawX = borderPx;
    const drawY = borderPx;
    const drawSize = displaySize - (borderPx * 2);
    const cellSize = drawSize / moduleCount;

    return { drawX, drawY, drawSize, cellSize, borderPx };
};

export const ALIGNMENT_PATTERN_COORDINATES: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
  11: [6, 30, 54],
  12: [6, 32, 58],
  13: [6, 34, 62],
  14: [6, 26, 46, 66],
  15: [6, 26, 48, 70],
  16: [6, 26, 50, 74],
  17: [6, 30, 54, 78],
  18: [6, 30, 56, 82],
  19: [6, 30, 58, 86],
  20: [6, 34, 62, 90],
  21: [6, 28, 50, 72, 94],
  22: [6, 26, 50, 74, 98],
  23: [6, 30, 54, 78, 102],
  24: [6, 28, 54, 80, 106],
  25: [6, 32, 58, 84, 110],
  26: [6, 30, 58, 86, 114],
  27: [6, 34, 62, 90, 118],
  28: [6, 26, 50, 74, 98, 122],
  29: [6, 30, 54, 78, 102, 126],
  30: [6, 26, 52, 78, 104, 130],
  31: [6, 30, 56, 82, 108, 134],
  32: [6, 34, 60, 86, 112, 138],
  33: [6, 30, 58, 86, 114, 142],
  34: [6, 34, 62, 90, 118, 146],
  35: [6, 30, 54, 78, 102, 126, 150],
  36: [6, 24, 50, 76, 102, 128, 154],
  37: [6, 28, 54, 80, 106, 132, 158],
  38: [6, 32, 60, 88, 116, 144, 172],
  39: [6, 26, 54, 82, 110, 138, 166],
  40: [6, 30, 58, 86, 114, 142, 170]
};

/**
 * Retrieves the centers (row, col) of all valid alignment patterns for a given version.
 * This excludes the 3 corners covered by the Finder Patterns.
 */
export function getAlignmentPatternCenters(version: number): { r: number; c: number }[] {
  const L = ALIGNMENT_PATTERN_COORDINATES[version];
  if (!L || L.length === 0) return [];

  const centers: { r: number; c: number }[] = [];
  const len = L.length;

  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      const ar = L[i];
      const ac = L[j];

      // Exclude the 3 corners covered by finder patterns
      const isTopLeft = i === 0 && j === 0;
      const isTopRight = i === 0 && j === len - 1;
      const isBottomLeft = i === len - 1 && j === 0;

      if (isTopLeft || isTopRight || isBottomLeft) {
        continue;
      }

      centers.push({ r: ar, c: ac });
    }
  }

  return centers;
}

/**
 * Checks if a coordinate (r, c) is within the 7x7 protection safety buffer
 * of any alignment pattern for the given QR code module count (size).
 */
export function isAlignmentPatternZone(r: number, c: number, size: number): boolean {
  const version = Math.round((size - 17) / 4);
  if (version < 2) return false;

  const centers = getAlignmentPatternCenters(version);
  for (const center of centers) {
    if (Math.abs(r - center.r) <= 3 && Math.abs(c - center.c) <= 3) {
      return true;
    }
  }
  return false;
}

