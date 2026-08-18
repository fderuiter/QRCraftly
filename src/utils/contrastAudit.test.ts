import { describe, it, expect } from 'vitest';
import { auditModuleContrast } from './contrastAudit';

describe('auditModuleContrast', () => {
  it('returns 0 violations and high min contrast for high-contrast solid background', () => {
    const width = 210;
    const height = 210;
    const moduleCount = 21; // 10x10 pixels per cell
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill canvas with white background (#ffffff) and black QR modules (#000000)
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        // Alternate modules to simulate QR code
        const isDark = (r + c) % 2 === 0;
        const color = isDark ? 0 : 255;

        for (let y = r * 10; y < (r + 1) * 10; y++) {
          for (let x = c * 10; x < (c + 1) * 10; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
          }
        }
      }
    }

    const result = auditModuleContrast({ data, width, height }, moduleCount);

    expect(result.violations).toBe(0);
    expect(result.minContrast).toBeGreaterThanOrEqual(15);
    expect(result.lowContrastCells).toHaveLength(0);
  });

  it('correctly maps cell boundaries and flags coordinates where local contrast is less than 3:1', () => {
    const width = 100;
    const height = 100;
    const moduleCount = 10; // 10x10 pixels per cell
    const data = new Uint8ClampedArray(width * height * 4);

    // Standard high contrast black and white modules
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        const isDark = (r + c) % 2 === 0;
        const color = isDark ? 0 : 255;

        for (let y = r * 10; y < (r + 1) * 10; y++) {
          for (let x = c * 10; x < (c + 1) * 10; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = color;
            data[idx + 1] = color;
            data[idx + 2] = color;
            data[idx + 3] = 255;
          }
        }
      }
    }

    // Introduce low-contrast artwork under dark module coordinate (2, 2)
    // Changing cell (2, 2) to gray #a0a0a0 (luminance ~0.35, contrast vs light < 3.0)
    const targetRow = 2;
    const targetCol = 2;
    for (let y = targetRow * 10; y < (targetRow + 1) * 10; y++) {
      for (let x = targetCol * 10; x < (targetCol + 1) * 10; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 160;
        data[idx + 1] = 160;
        data[idx + 2] = 160;
        data[idx + 3] = 255;
      }
    }

    const result = auditModuleContrast({ data, width, height }, moduleCount);

    expect(result.violations).toBeGreaterThan(0);
    expect(result.minContrast).toBeLessThan(3.0);
    const flagged = result.lowContrastCells.some((cell) => cell.row === targetRow && cell.col === targetCol);
    expect(flagged).toBe(true);
  });

  it('handles empty or invalid inputs gracefully', () => {
    const emptyResult = auditModuleContrast({ data: new Uint8ClampedArray(0), width: 0, height: 0 }, 0);
    expect(emptyResult.violations).toBe(0);
    expect(emptyResult.minContrast).toBe(21);
    expect(emptyResult.lowContrastCells).toEqual([]);
  });
});
