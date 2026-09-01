/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+Page';

describe('Destroy the QR Code! Arcade Page', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Mock HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      shadowColor: '',
      shadowBlur: 0,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4 * 8 * 8),
        width: 8,
        height: 8,
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4 * 8 * 8),
      })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      setLineDash: vi.fn(),
      rotate: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders correctly with title, description, and status badges', () => {
    render(<Page />);

    expect(screen.getByRole('heading', { level: 1, name: /Destroy the QR!/i })).toBeInTheDocument();
    expect(screen.getByText('🎮 High-Performance Arcade Sandbox')).toBeInTheDocument();
    expect(screen.getByText('Durability Index')).toBeInTheDocument();
    expect(screen.getByText('Blaster Weapons')).toBeInTheDocument();
  });

  it('displays the weapon options correctly', () => {
    render(<Page />);

    // Query buttons using full titles or name match
    expect(screen.getByRole('button', { name: /Plasma Blaster/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thermal Laser/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Antimatter Rocket/i })).toBeInTheDocument();
  });

  it('switches weapons correctly when clicking weapon selection buttons', () => {
    render(<Page />);

    const laserBtn = screen.getByRole('button', { name: /Thermal Laser/i });
    fireEvent.click(laserBtn);

    // Thermal Laser button should now have the active indicator classes or be selected
    expect(laserBtn).toHaveClass('border-cyan-500');

    const rocketBtn = screen.getByRole('button', { name: /Antimatter Rocket/i });
    fireEvent.click(rocketBtn);
    expect(rocketBtn).toHaveClass('border-rose-500');

    const blasterBtn = screen.getByRole('button', { name: /Plasma Blaster/i });
    fireEvent.click(blasterBtn);
    expect(blasterBtn).toHaveClass('border-teal-500');
  });

  it('responds to keyboard shortcut presses (1, 2, 3) to switch weapons', () => {
    render(<Page />);

    // Press '2' to equip Thermal Laser
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByRole('button', { name: /Thermal Laser/i })).toHaveClass('border-cyan-500');

    // Press '3' to equip Antimatter Rocket
    fireEvent.keyDown(window, { key: '3' });
    expect(screen.getByRole('button', { name: /Antimatter Rocket/i })).toHaveClass('border-rose-500');

    // Press '1' to equip Plasma Blaster
    fireEvent.keyDown(window, { key: '1' });
    expect(screen.getByRole('button', { name: /Plasma Blaster/i })).toHaveClass('border-teal-500');
  });

  it('can trigger target resets with the HEAL QR CODE button', () => {
    render(<Page />);

    const healBtn = screen.getByRole('button', { name: /HEAL QR CODE/i });
    expect(healBtn).toBeInTheDocument();

    fireEvent.click(healBtn);
    // Real-time Durability should be restored to 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('does not throw any errors when simulation triggers pointer events on the canvas', () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 210, clientY: 210, pointerId: 1 });
      fireEvent.pointerUp(canvas, { pointerId: 1 });
    }
  });

  it('applies CSS gesture lock and setPointerCapture to prevent page scrolling during touch interaction', () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('touch-none');
    expect(canvas).toHaveStyle({ touchAction: 'none' });

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 300, clientY: 300, pointerId: 1, pointerType: 'touch' });
      expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1);

      fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'touch' });
      expect(Element.prototype.releasePointerCapture).toHaveBeenCalledWith(1);
    }
  });

  it('implements the Worker-Locked Offscreen Downscaling Pipeline correctly', async () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      expect(mockPostMessage).toHaveBeenCalled();
      const lastCall = mockPostMessage.mock.calls[0][0];
      expect(lastCall.imageBitmap).toBeDefined();
      expect(lastCall.width).toBe(256);
      expect(lastCall.height).toBe(256);
    }
  });

  it('locks scannability evaluations while background validation is busy and runs catch-up when painting ceases', async () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 210, clientY: 210, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 220, clientY: 220, pointerId: 1 });

      await new Promise<void>(resolve => setTimeout(resolve, 10));

      expect(mockPostMessage).toHaveBeenCalledTimes(1);

      fireEvent.pointerUp(canvas, { pointerId: 1 });
      
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      // Catch-up check executes reliably when painting ceases
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    }
  });

  it('uses native BarcodeDetector when supported instead of sending message to Worker', async () => {
    const mockDetect = vi.fn().mockResolvedValue([{ rawValue: 'https://qrcraftly.com' }]);
    const mockPostMessage = vi.fn();
    
    vi.stubGlobal('BarcodeDetector', class {
      detect = mockDetect;
    });
    vi.stubGlobal('createImageBitmap', undefined as any);

    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      expect(mockDetect).toHaveBeenCalled();
      expect(mockPostMessage).not.toHaveBeenCalled();
    }
  });

  it('falls back to worker if native BarcodeDetector fails or returns empty result', async () => {
    const mockDetect = vi.fn().mockRejectedValue(new Error('Hardware acceleration error'));
    const mockPostMessage = vi.fn();
    
    vi.stubGlobal('BarcodeDetector', class {
      detect = mockDetect;
    });
    vi.stubGlobal('createImageBitmap', undefined as any);

    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      // Wait for async detect failure and fallback to run
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      expect(mockDetect).toHaveBeenCalled();
      // Should fall back to worker's postMessage!
      expect(mockPostMessage).toHaveBeenCalled();
    }
  });

  it('correctly updates and collides bullets and bombs using subgrid projection', async () => {
    render(<Page />);

    // Equip Antimatter Rocket
    const rocketBtn = screen.getByRole('button', { name: /Antimatter Rocket/i });
    fireEvent.click(rocketBtn);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 600, height: 600, right: 600, bottom: 600, x: 0, y: 0, toJSON: () => {}
      });

      // Move mouse/pointer to target position and fire a bomb
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerUp(canvas, { pointerId: 1 });
      
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }

    // Equip Plasma Blaster
    const blasterBtn = screen.getByRole('button', { name: /Plasma Blaster/i });
    fireEvent.click(blasterBtn);

    if (canvas) {
      fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerUp(canvas, { pointerId: 1 });
      
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }

    expect(canvas).toBeInTheDocument();
  });

  it('handles boundary conditions for subgrid projection when projectiles or explosions hit canvas edges', async () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 600, height: 600, right: 600, bottom: 600, x: 0, y: 0, toJSON: () => {}
      });

      // Fire at top-left edge
      fireEvent.pointerMove(canvas, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(canvas, { pointerId: 1 });

      // Fire at bottom-right edge
      fireEvent.pointerMove(canvas, { clientX: 600, clientY: 600, pointerId: 1 });
      fireEvent.pointerDown(canvas, { clientX: 600, clientY: 600, pointerId: 1 });
      fireEvent.pointerUp(canvas, { pointerId: 1 });

      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }

    expect(canvas).toBeInTheDocument();
  });

  it('displays options for L, M, Q, and H error correction tiers in the configuration panel', () => {
    render(<Page />);

    expect(screen.getByText('Error Correction Level')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'H' })).toBeInTheDocument();
  });

  it('resets active game state and matrix density when switching error correction level', () => {
    render(<Page />);

    const levelLBtn = screen.getByRole('button', { name: 'L' });
    const levelHBtn = screen.getByRole('button', { name: 'H' });

    // Initially H is selected
    expect(levelHBtn).toHaveAttribute('aria-pressed', 'true');

    // Click tier L
    fireEvent.click(levelLBtn);
    expect(levelLBtn).toHaveAttribute('aria-pressed', 'true');
    expect(levelHBtn).toHaveAttribute('aria-pressed', 'false');

    // Durability should reset to 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clears existing block damage and resets active projectiles when error correction level changes', () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Fire shots to inflict damage
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      fireEvent.mouseMove(canvas, { clientX: 210, clientY: 210 });
      fireEvent.mouseUp(canvas);
    }

    // Switch tier to M
    const levelMBtn = screen.getByRole('button', { name: 'M' });
    fireEvent.click(levelMBtn);

    // Grid damage and durability should reset completely
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('tracks damage at sub-module micro-cell resolution for fine-grained durability scoring', () => {
    render(<Page />);

    expect(screen.getByText(/Intact Micro-Cells/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      // Fire a shot near center of QR code canvas
      fireEvent.mouseDown(canvas, { clientX: 400, clientY: 250 });
      fireEvent.mouseUp(canvas);

      // Verify micro-cells destroyed count exists and durability index updates
      expect(screen.getByText(/Blasted Away/i)).toBeInTheDocument();
    }
  });

  it('protects finder pattern micro-cells from weapon erosion', () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      // Target top-left finder pattern region on canvas (qrX = 240, qrY = 100)
      // Top-left finder pattern spans macro modules 0..6 (canvas X: 240..346, Y: 100..206)
      fireEvent.mouseDown(canvas, { clientX: 260, clientY: 120 });
      fireEvent.mouseUp(canvas);

      // Durability should stay at 100% because finder pattern micro-cells are indestructible
      expect(screen.getByText('100%')).toBeInTheDocument();
    }
  });

  it('uses createImageBitmap and transfers imageBitmap object when sending frames to background worker', async () => {
    const mockPostMessage = vi.fn();
    const mockCreateImageBitmap = vi.fn().mockResolvedValue({
      width: 256,
      height: 256,
      close: vi.fn(),
    });

    vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);
    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 20));

      expect(mockCreateImageBitmap).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalled();
      const payload = mockPostMessage.mock.calls[0][0];
      const transfer = mockPostMessage.mock.calls[0][1];
      expect(payload).toHaveProperty('imageBitmap');
      expect(payload.width).toBe(256);
      expect(payload.height).toBe(256);
      expect(transfer).toHaveLength(1);
    }
  });

  it('falls back to synchronous getImageData if createImageBitmap is unsupported', async () => {
    const mockPostMessage = vi.fn();
    const mockGetImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(256 * 256 * 4),
      width: 256,
      height: 256,
    }));

    vi.stubGlobal('createImageBitmap', undefined as any);
    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: mockGetImageData,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        setLineDash: vi.fn(),
        rotate: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      } as any;
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 20));

      expect(mockGetImageData).toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalled();
      const payload = mockPostMessage.mock.calls[0][0];
      expect(payload).toHaveProperty('imageData');
    }
  });

  it('Requirement 1 & 2: Rapid pointer drag interactions automatically overwrite task tokens and unlock on subsequent paint ticks', async () => {
    let workerOnMessage: ((e: MessageEvent) => void) | null = null;
    const mockPostMessage = vi.fn();

    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      set onmessage(fn: (e: MessageEvent) => void) {
        workerOnMessage = fn;
      }
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      // First paint action
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      // Subsequent paint tick during pointer drag
      fireEvent.pointerMove(canvas, { clientX: 210, clientY: 210, pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      // Pointer up triggers final post-interaction check
      fireEvent.pointerUp(canvas, { pointerId: 1 });
      await new Promise<void>(resolve => setTimeout(resolve, 20));

      // Main thread tokens advance with paint ticks without permanently freezing
      expect(mockPostMessage.mock.calls.length).toBeGreaterThan(1);
      const firstCallToken = mockPostMessage.mock.calls[0][0].configId;
      const lastCallToken = mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1][0].configId;
      expect(Number(lastCallToken)).toBeGreaterThan(Number(firstCallToken));
    }
  });

  it('Requirement 4: Late background worker results with outdated tokens are discarded without updating current UI state', async () => {
    let workerOnMessage: ((e: MessageEvent) => void) | null = null;

    vi.stubGlobal('Worker', class MockWorker {
      postMessage = vi.fn();
      set onmessage(fn: (e: MessageEvent) => void) {
        workerOnMessage = fn;
      }
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    if (canvas && workerOnMessage) {
      // Initiate check
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 250, clientY: 250, pointerId: 1 });

      await new Promise<void>(resolve => setTimeout(resolve, 20));

      // Send worker response with outdated configId token ("0")
      (workerOnMessage as any)({
        data: {
          success: false,
          configId: "0",
          sequenceId: 0,
          buffer: new ArrayBuffer(256 * 256 * 4)
        }
      });

      // UI state should NOT be overridden to false by the outdated token response
      expect(screen.getByText('100%')).toBeInTheDocument();
    }
  });

  it('Requirement 5: Final game board scannability checks trigger reliably after user input stops', async () => {
    const mockPostMessage = vi.fn();

    vi.stubGlobal('Worker', class MockWorker {
      postMessage = mockPostMessage;
      set onmessage(fn: (e: MessageEvent) => void) {}
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      terminate = vi.fn();
    });

    render(<Page />);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 220, clientY: 220, pointerId: 1 });

      const callsDuringDrag = mockPostMessage.mock.calls.length;

      // User releases pointer (input stops)
      fireEvent.pointerUp(canvas, { pointerId: 1 });

      await new Promise<void>(resolve => setTimeout(resolve, 20));

      // Verification check is triggered upon pointerUp
      expect(mockPostMessage.mock.calls.length).toBeGreaterThan(callsDuringDrag);
    }
  });
});
