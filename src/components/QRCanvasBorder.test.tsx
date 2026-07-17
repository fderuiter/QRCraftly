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


import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig } from '../types';

describe('QRCanvas Border Rendering', () => {
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
  };

  const setupCanvasMock = (originalCreateElement: any) => {
    // Use the original create element to make a real canvas, then mock getContext
    const canvas = originalCreateElement.call(document, 'canvas');
    const context = { ...mockContext, canvas };
    canvas.getContext = vi.fn().mockReturnValue(context);
    return canvas;
  };

  it('renders border when enabled', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
        return originalCreateElement.call(document, tagName);
    }) as any;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderColor: '#ff0000',
      bgColor: '#ffffff',
      value: 'test',
    };

    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
    });

    const fillRectCalls = mockContext.fillRect.mock.calls;

    // Find the call for the border: 0, 0, 100, 100
    const borderCall = fillRectCalls.find(call => call[0] === 0 && call[1] === 0 && call[2] === 100 && call[3] === 100);
    expect(borderCall).toBeTruthy();

    // Find the call for the inner background: 10, 10, 80, 80 (since 0.1 * 100 = 10px border on each side)
    const innerBgCall = fillRectCalls.find(call => call[0] > 13 && call[0] < 14 && call[2] > 72 && call[2] < 73);
    expect(innerBgCall).toBeTruthy();

    document.createElement = originalCreateElement;
  });

  it('does not render border when disabled', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
        return originalCreateElement.call(document, tagName);
    }) as any;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: false,
      borderSize: 0.1,
      borderColor: '#ff0000',
    };

    mockContext.fillRect.mockClear();
    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
        expect(mockContext.fillRect).toHaveBeenCalled();
    });

    const fillRectCalls = mockContext.fillRect.mock.calls;

    // Should NOT have inner background fill (10, 10, 80, 80)
    const innerBgCall = fillRectCalls.find(call => call[0] > 13 && call[0] < 14 && call[2] > 72 && call[2] < 73);
    expect(innerBgCall).toBeUndefined();

    document.createElement = originalCreateElement;
  });
});
