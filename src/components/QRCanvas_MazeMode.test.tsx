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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig, QRErrorCorrectionLevel, QRStyle } from '../types';

describe('QRCanvas Maze Mode Support', () => {
  const mockContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
  };

  let originalCreateElement: any;

  const setupCanvasMock = (orig: any) => {
    const canvas = orig.call(document, 'canvas');
    const context = { ...mockContext, canvas };
    canvas.getContext = vi.fn().mockReturnValue(context);
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
    });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    return canvas;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
      return originalCreateElement.call(document, tagName);
    }) as any;
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  it('renders path overlay when Maze Mode is enabled', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isMazeModeEnabled: true,
      style: QRStyle.CIRCUIT,
      errorCorrectionLevel: QRErrorCorrectionLevel.H,
      value: 'maze-test-url',
    };

    render(<QRCanvas config={config} size={400} />);

    // Canvas should render the grid and start/end highlights
    await waitFor(() => {
      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  it('allows pointer-dragging interactions to trace a path', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isMazeModeEnabled: true,
      style: QRStyle.CIRCUIT,
      errorCorrectionLevel: QRErrorCorrectionLevel.H,
      value: 'interactive-maze-test',
    };

    const { container } = render(<QRCanvas config={config} size={400} />);
    const canvas = container.querySelector('canvas')!;

    // Simulate mouse down near top-left eyeball center (r=3, c=3)
    fireEvent.pointerDown(canvas, {
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });

    // Simulate dragging to an adjacent cell (e.g. col 3, row 4 / clientY slightly down)
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 65,
      pointerId: 1,
    });

    // Simulate pointerup to release
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
    });

    await waitFor(() => {
      expect(mockContext.lineTo).toHaveBeenCalled();
    });
  });
});
