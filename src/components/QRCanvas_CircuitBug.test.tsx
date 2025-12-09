
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import * as QRCode from 'qrcode';

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    create: vi.fn(),
  },
}));

// Mock Image
const originalImage = window.Image;

describe('QRCanvas Circuit Style Bug', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history

    // Setup Mock Canvas Context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
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

    (QRCode.default.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    // Mock Image
    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
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
     render(<QRCanvas config={config} size={size} />);

     await waitFor(() => {
        expect(QRCode.default.create).toHaveBeenCalled();
     });

     // Calculate expected coordinates
     const moduleCount = 21;
     const displaySize = size; // 100
     const cellSize = displaySize / moduleCount; // 100 / 21 ~= 4.76

     const r = 10;
     const c = 10;

     const x = c * cellSize;
     const y = r * cellSize;
     const cx = x + cellSize / 2;
     const cy = y + cellSize / 2;
     const thickness = cellSize * 0.4;

     // Expected fillRect for RIGHT connection
     // Should be centered vertically at cy
     // x: cx
     // y: cy - thickness/2
     // w: cellSize/2 + 1
     // h: thickness

     const expectedY = cy - thickness / 2;

     // Find calls that look like the trace
     // The main cell is also drawn using drawRoundRect -> ctx.roundRect or fallback
     // The trace is drawn using ctx.fillRect

     const calls = mockContext.fillRect.mock.calls;

     // Filter for calls that match the dimensions of the trace
     // We are looking for the 'hasRight' trace
     // It should have width approx cellSize/2 + 1
     // and height approx thickness

     const traceCall = calls.find((args: any[]) => {
         const [dx, dy, dw, dh] = args;
         // Check dimensions
         const widthMatch = Math.abs(dw - (cellSize/2 + 1)) < 0.1;
         const heightMatch = Math.abs(dh - thickness) < 0.1;
         const xMatch = Math.abs(dx - cx) < 0.1;

         return widthMatch && heightMatch && xMatch;
     });

     expect(traceCall).toBeDefined();

     const [drawnX, drawnY, drawnW, drawnH] = traceCall;

     expect(drawnY).toBeCloseTo(expectedY, 0.01);
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
     render(<QRCanvas config={config} size={size} />);

     await waitFor(() => {
        expect(QRCode.default.create).toHaveBeenCalled();
     });

     const moduleCount = 21;
     const displaySize = size;
     const cellSize = displaySize / moduleCount;

     const r = 10;
     const c = 10;

     const x = c * cellSize;
     const y = r * cellSize;
     const cx = x + cellSize / 2;
     const cy = y + cellSize / 2;
     const thickness = cellSize * 0.4;

     // Expected fillRect for BOTTOM connection
     // Should be centered horizontally at cx
     // x: cx - thickness/2
     // y: cy
     // w: thickness
     // h: cellSize/2 + 1

     const expectedX = cx - thickness / 2;

     const calls = mockContext.fillRect.mock.calls;

     const traceCall = calls.find((args: any[]) => {
         const [dx, dy, dw, dh] = args;
         const widthMatch = Math.abs(dw - thickness) < 0.1;
         const heightMatch = Math.abs(dh - (cellSize/2 + 1)) < 0.1;
         const yMatch = Math.abs(dy - cy) < 0.1;

         return widthMatch && heightMatch && yMatch;
     });

     expect(traceCall).toBeDefined();
     const [drawnX] = traceCall;

     expect(drawnX).toBeCloseTo(expectedX, 0.01);
  });
});
