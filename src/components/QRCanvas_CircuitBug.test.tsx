/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import QRCode from 'qrcode';

describe('QRCanvas Circuit Style Bug', () => {
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history

    // Setup Mock QRCode Data
    const size = 21;
    mockModules = {
      size: size,
      get: vi.fn().mockReturnValue(false),
    };

    (QRCode.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
    } as any;
  });

  it('draws traces centered on cell axes for CIRCUIT style', async () => {
     // Setup modules such that we have a connection
     // Let's test connection to the Right (col+1)
     // Cell at (10, 10) connects to (10, 11)
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true;
        if (r === 10 && c === 11) return true; // Right neighbor
        return false;
     });

     const config = { ...DEFAULT_CONFIG, style: QRStyle.CIRCUIT, value: 'test' };
     const size = 100;
     const { container } = render(<QRCanvas config={config} size={size} />);

     await waitFor(() => {
        expect(QRCode.create).toHaveBeenCalled();
     });

     const canvas = container.querySelector('canvas') as HTMLCanvasElement;
     const ctx = canvas.getContext('2d') as any;

     // Calculate expected coordinates
     const moduleCount = 21;
     const displaySize = size; // 100
     const minBorderPx = (4 * displaySize) / (moduleCount + 8);
     const cellSize = (displaySize - 2 * minBorderPx) / moduleCount; // 100 / 21 ~= 4.76

     const r = 10;
     const c = 10;

     const x = minBorderPx + c * cellSize;
     const y = minBorderPx + r * cellSize;
     const cx = x + cellSize / 2;
     const cy = y + cellSize / 2;

     // Main cell (10, 10) should be filled
     expect(ctx.isFilled(cx, cy)).toBe(true);

     // Connected right cell (10, 11) should be filled
     expect(ctx.isFilled(cx + cellSize, cy)).toBe(true);

     // Unconnected left cell (10, 9) should be empty
     expect(ctx.isFilled(cx - cellSize, cy)).toBe(false);

     // Unconnected top cell (9, 10) should be empty
     expect(ctx.isFilled(cx, cy - cellSize)).toBe(false);

     // Unconnected bottom cell (11, 10) should be empty
     expect(ctx.isFilled(cx, cy + cellSize)).toBe(false);
  });

  it('draws vertical traces centered on cell axes for CIRCUIT style', async () => {
     // Setup modules such that we have a connection to Bottom
     // Cell at (10, 10) connects to (11, 10)
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true;
        if (r === 11 && c === 10) return true; // Bottom neighbor
        return false;
     });

     const config = { ...DEFAULT_CONFIG, style: QRStyle.CIRCUIT, value: 'test' };
     const size = 100;
     const { container } = render(<QRCanvas config={config} size={size} />);

     await waitFor(() => {
        expect(QRCode.create).toHaveBeenCalled();
     });

     const canvas = container.querySelector('canvas') as HTMLCanvasElement;
     const ctx = canvas.getContext('2d') as any;

     const moduleCount = 21;
     const displaySize = size;
     const minBorderPx = (4 * displaySize) / (moduleCount + 8);
     const cellSize = (displaySize - 2 * minBorderPx) / moduleCount;

     const r = 10;
     const c = 10;

     const x = minBorderPx + c * cellSize;
     const y = minBorderPx + r * cellSize;
     const cx = x + cellSize / 2;
     const cy = y + cellSize / 2;

     // Main cell (10, 10) should be filled
     expect(ctx.isFilled(cx, cy)).toBe(true);

     // Connected bottom cell (11, 10) should be filled
     expect(ctx.isFilled(cx, cy + cellSize)).toBe(true);

     // Unconnected top cell (9, 10) should be empty
     expect(ctx.isFilled(cx, cy - cellSize)).toBe(false);

     // Unconnected left cell (10, 9) should be empty
     expect(ctx.isFilled(cx - cellSize, cy)).toBe(false);

     // Unconnected right cell (10, 11) should be empty
     expect(ctx.isFilled(cx + cellSize, cy)).toBe(false);
  });
});
