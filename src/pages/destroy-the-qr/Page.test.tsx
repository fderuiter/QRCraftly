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
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+Page';

describe('Destroy the QR Code! Arcade Page', () => {
  beforeEach(() => {
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders correctly with title, description, and status badges', () => {
    render(<Page />);

    expect(screen.getByRole('heading', { name: /Destroy the QR!/i })).toBeInTheDocument();
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

  it('does not throw any errors when simulation triggers clicks on the canvas', () => {
    render(<Page />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      fireEvent.mouseMove(canvas, { clientX: 210, clientY: 210 });
      fireEvent.mouseUp(canvas);
    }
  });

  it('implements the Worker-Locked Offscreen Downscaling Pipeline correctly', async () => {
    const mockDrawImage = vi.fn();
    const mockGetImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(256 * 256 * 4),
      width: 256,
      height: 256,
    }));

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement, contextId: string) {
      if (this.width === 256 && this.height === 256) {
        return {
          clearRect: vi.fn(),
          drawImage: mockDrawImage,
          getImageData: mockGetImageData,
        } as any;
      }
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
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
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      
      expect(mockDrawImage).toHaveBeenCalled();
      expect(mockGetImageData).toHaveBeenCalled();

      const lastDrawCall = mockDrawImage.mock.calls[0];
      expect(lastDrawCall[5]).toBe(0);
      expect(lastDrawCall[6]).toBe(0);
      expect(lastDrawCall[7]).toBe(256);
      expect(lastDrawCall[8]).toBe(256);
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
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      fireEvent.mouseMove(canvas, { clientX: 210, clientY: 210 });
      fireEvent.mouseMove(canvas, { clientX: 220, clientY: 220 });

      expect(mockPostMessage).toHaveBeenCalledTimes(1);

      fireEvent.mouseUp(canvas);
      
      await new Promise<void>(resolve => setTimeout(resolve, 30));

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
    }
  });

  it('uses native BarcodeDetector when supported instead of sending message to Worker', async () => {
    const mockDetect = vi.fn().mockResolvedValue([{ rawValue: 'https://qrcraftly.com' }]);
    const mockPostMessage = vi.fn();
    
    vi.stubGlobal('BarcodeDetector', class {
      detect = mockDetect;
    });
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
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      
      // Wait for async detect call to finish
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      // Should call native detect
      expect(mockDetect).toHaveBeenCalled();
      // Should NOT call worker postMessage because native was successful
      expect(mockPostMessage).not.toHaveBeenCalled();
    }
  });

  it('seamlessly falls back to Worker if BarcodeDetector detection throws an error', async () => {
    const mockDetect = vi.fn().mockRejectedValue(new Error('Hardware acceleration failed'));
    const mockPostMessage = vi.fn();
    
    vi.stubGlobal('BarcodeDetector', class {
      detect = mockDetect;
    });
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
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      
      // Wait for async detect failure and fallback to run
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      expect(mockDetect).toHaveBeenCalled();
      // Should fall back to worker's postMessage!
      expect(mockPostMessage).toHaveBeenCalled();
    }
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
});
