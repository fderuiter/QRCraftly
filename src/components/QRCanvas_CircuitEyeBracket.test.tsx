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

// Mock qrcode module


describe('QRCanvas Circuit Style Eye Bracket Bug', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history

    // Setup Mock Canvas Context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    };

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

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

  
  it('verifies that the bracket cuts in Circuit style are deep enough (fixed)', async () => {
     const config = { ...DEFAULT_CONFIG, style: QRStyle.CIRCUIT, value: 'test', eyeColor: '#000000', bgColor: '#ffffff' };
     const size = 100;
     render(<QRCanvas config={config} size={size} />);

     await waitFor(() => {
        expect(QRCode.create).toHaveBeenCalled();
     });

     const moduleCount = 21;
     const displaySize = size; // 100
     const minBorderPx = (4 * displaySize) / (moduleCount + 8);
     const cellSize = (displaySize - 2 * minBorderPx) / moduleCount;

     // The implementation draws the cuts using fillRect with bgColor
     // We are looking for the calls to fillRect that make the cuts
     // The fix sets depth to cellSize * 1.1

     // Top cut: ctx.fillRect(cx - gap/2, y, gap, cellSize * 1.1);

     const calls = mockContext.fillRect.mock.calls;

     // Look for the Top Cut
     // It should have height = cellSize * 1.1
     const topCutCall = calls.find((args: any[]) => {
         const [_dx, _dy, _dw, dh] = args;
         // Check dimensions
         const heightMatch = Math.abs(dh - (cellSize * 1.1)) < 0.01;
         return heightMatch;
     });

     // Expect to find the cut call
     expect(topCutCall).toBeDefined();

     // Confirm the depth is correct
     expect(topCutCall[3]).toBeCloseTo(cellSize * 1.1, 0.001);
  });
});
