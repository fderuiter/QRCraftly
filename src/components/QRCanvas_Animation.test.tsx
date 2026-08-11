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

import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import QRCode from 'qrcode';

describe('QRCanvas Animation Loop', () => {
  let mockContext: any;
  let rafCallback: any = null;
  let rafId = 0;
  let mockTime = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallback = null;
    rafId = 0;
    mockTime = 1000;

    vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

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
      canvas: { width: 0, height: 0 },
      fillStyle: '',
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

    // Mock requestAnimationFrame to capture loop callback
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      rafCallback = cb;
      return ++rafId;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    rafCallback = null;
    vi.restoreAllMocks();
  });

  it('pre-calculates and caches frame matrices, and runs animation loop', async () => {
    const animationValues = ['frame_one', 'frame_two', 'frame_three'];
    const config = {
      ...DEFAULT_CONFIG,
      animationValues,
      isAnimating: true,
      animationFps: 30,
    };

    await act(async () => {
      render(<QRCanvas config={config} />);
    });

    // Wait for the asynchronous qrcode module load and precomputation
    await vi.waitFor(() => {
      expect(QRCode.create).toHaveBeenCalledWith('frame_one', expect.any(Object));
      expect(QRCode.create).toHaveBeenCalledWith('frame_two', expect.any(Object));
      expect(QRCode.create).toHaveBeenCalledWith('frame_three', expect.any(Object));
    });

    // Verify requestAnimationFrame is called
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(rafCallback).not.toBeNull();

    // Advance time to draw frames
    mockTime += 40; // Advance time by > 33.3ms (for 30fps)
    await act(async () => {
      await Promise.resolve(); // Flush microtask queue
      rafCallback(mockTime);
    });

    // Clear rect should be called on frame draw
    expect(mockContext.clearRect).toHaveBeenCalled();
  });

  it('preserves static canvas dimensions during active looping to prevent buffer clearing and flickering', async () => {
    const animationValues = ['frame_one', 'frame_two'];
    const config = {
      ...DEFAULT_CONFIG,
      animationValues,
      isAnimating: true,
      animationFps: 30,
    };

    let container: HTMLElement | null = null;
    await act(async () => {
      const rendered = render(<QRCanvas config={config} size={512} />);
      container = rendered.container;
    });

    const canvas = container!.querySelector('canvas') as HTMLCanvasElement;

    // Wait for the precomputation
    await vi.waitFor(() => {
      expect(QRCode.create).toHaveBeenCalledWith('frame_one', expect.any(Object));
    });

    // Check that the width and height are fixed
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);

    // execute the RAF loop by advancing mockTime
    mockTime += 50;
    await act(async () => {
      await Promise.resolve(); // Flush microtask queue
      rafCallback(mockTime);
    });

    // Canvas width and height should remain perfectly static (unchanged)
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
  });

  it('stops loop cleanly on component unmount and cancels next requestAnimationFrame', async () => {
    const animationValues = ['frame_one'];
    const config = {
      ...DEFAULT_CONFIG,
      animationValues,
      isAnimating: true,
    };

    let unmount: () => void = () => {};
    await act(async () => {
      const rendered = render(<QRCanvas config={config} />);
      unmount = rendered.unmount;
    });

    await vi.waitFor(() => {
      expect(QRCode.create).toHaveBeenCalled();
    });

    expect(window.requestAnimationFrame).toHaveBeenCalled();

    // Unmount should cancel the RAF
    await act(async () => {
      unmount();
    });
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
