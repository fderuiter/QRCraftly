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

describe('QRCanvas Batch Rendering Optimization', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Mock Canvas Context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
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

  const setModule = (r: number, c: number, val: boolean) => {
      mockModules.get.mockImplementation((row: number, col: number) => {
          if (row === r && col === c) return val;
          return false;
      });
  };

  it('batches fill calls for HIVE style', async () => {
      // Set up 5 modules scattered around
      mockModules.get.mockImplementation((r: number, c: number) => {
          // Avoid eyes (0-7, 0-7), (0-7, 14-21), (14-21, 0-7)
          if (r === 10 && c >= 10 && c < 15) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // 3 eyes (1 fill each for HIVE style eye pupil) + 1 batch fill for modules = 4 fills
          // Previously, this would be 3 + 5 = 8 fills.
          expect(mockContext.fill).toHaveBeenCalledTimes(4);
      });
  });

  it('batches fill calls for STARBURST style', async () => {
      // Set up 5 modules scattered around
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c >= 10 && c < 15) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // 3 eyes (1 fill each for STARBURST eye pupil) + 1 batch fill for modules = 4 fills
          expect(mockContext.fill).toHaveBeenCalledTimes(4);
      });
  });
});
