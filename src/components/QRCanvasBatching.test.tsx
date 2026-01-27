import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import QRCode from 'qrcode';

// Mock qrcode module
vi.mock('qrcode', () => {
  const createMock = vi.fn();
  return {
    create: createMock,
    default: {
      create: createMock,
    },
  };
});

// Mock Image
const originalImage = window.Image;

describe('QRCanvas Batch Rendering', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks();

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
      quadraticCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

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

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  const setModules = (indices: [number, number][]) => {
      mockModules.get.mockImplementation((row: number, col: number) => {
          return indices.some(([r, c]) => r === row && c === col);
      });
  };

  it('batches HIVE style rendering (few fill calls for many modules)', async () => {
      // Set multiple modules active (not eyes)
      // Eyes are at (0-6, 0-6), (0-6, 14-20), (14-20, 0-6)
      // (10, 10) is safe.
      setModules([[10, 10], [10, 11], [11, 10], [11, 11]]);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Expected Fills:
          // 1. Batched modules (all 4 in one path) -> 1 call
          // 2. Eyes: 3 eyes. HIVE eye pupil uses drawPoly(fill=true). Frame/Hole use fillRect.
          // So 3 calls for eyes.
          // Total = 4.
          expect(mockContext.fill).toHaveBeenCalledTimes(4);

          // Verify path construction happened
          expect(mockContext.lineTo.mock.calls.length).toBeGreaterThan(20);
      });
  });

  it('batches STARBURST style rendering', async () => {
      setModules([[10, 10], [10, 11], [11, 10], [11, 11]]);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Expected Fills:
          // 1. Batched modules -> 1 call
          // 2. Eyes: 3 eyes. STARBURST eye pupil uses drawStar(fill=true). Frame/Hole use fillRect.
          // So 3 calls for eyes.
          // Total = 4.
          expect(mockContext.fill).toHaveBeenCalledTimes(4);

          expect(mockContext.lineTo.mock.calls.length).toBeGreaterThan(40);
      });
  });
});
