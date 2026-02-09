
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

describe('QRCanvas Batching Performance', () => {
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
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') return mockContext;
      return null;
    });

    // Setup Mock QRCode Data (21x21 is standard Version 1)
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

  const modulesMap = new Set<string>();
  const setModule = (r: number, c: number, val: boolean) => {
      if (val) modulesMap.add(`${r},${c}`);
      else modulesMap.delete(`${r},${c}`);
  };

  beforeEach(() => {
      modulesMap.clear();
      mockModules.get.mockImplementation((row: number, col: number) => modulesMap.has(`${row},${col}`));
  });

  it('HIVE style IS batched (low fill count)', async () => {
      // enable 3 modules (not eyes)
      setModule(10, 10, true);
      setModule(10, 11, true);
      setModule(10, 12, true);

      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // 3 modules -> 1 batched fill.
          // 3 eyes -> 3 fills (pupils).
          // Total fills should be 4.
          expect(mockContext.fill).toHaveBeenCalledTimes(4);
      });
  });

  it('STARBURST style IS batched (low fill count)', async () => {
      // enable 3 modules
      setModule(10, 10, true);
      setModule(10, 11, true);
      setModule(10, 12, true);

      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // 3 modules -> 1 batched fill.
          // 3 eyes -> 3 fills (pupils).
          // Total fills should be 4.
          expect(mockContext.fill).toHaveBeenCalledTimes(4);
      });
  });

  it('GRUNGE style IS batched (low fillRect count)', async () => {
      // enable 3 modules
      setModule(10, 10, true);
      setModule(10, 11, true);
      setModule(10, 12, true);

      const config = { ...DEFAULT_CONFIG, style: QRStyle.GRUNGE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Grunge modules use drawRoughRect(addToPath=true) -> rect (no fillRect).
          // 3 modules -> 0 fillRects.
          // Eyes use drawRoughRect(addToPath=false) -> 3 fillRects (frames).
          // Eye holes -> 3 fillRects.
          // Background -> 1 fillRect.
          // Total fillRects = 7.
          expect(mockContext.fillRect).toHaveBeenCalledTimes(7);

          // And verify fill is called (1 for modules + 3 for eye pupils)
          expect(mockContext.fill).toHaveBeenCalledTimes(4);
      });
  });
});
