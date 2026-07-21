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
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from './canvasHelpers';

describe('canvasHelpers', () => {
  let ctx: any;

  beforeEach(() => {
    // specific cast to allow optional methods like roundRect
    ctx = {
      roundRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      rect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  });

  describe('drawRoundRect', () => {
    it('should always use unified manual path commands (quadraticCurveTo) even if roundRect is available', () => {
      drawRoundRect(ctx, 10, 20, 100, 50, 5);
      expect(ctx.roundRect).not.toHaveBeenCalled();
      
      expect(ctx.moveTo).toHaveBeenCalled(); // Starting point
      expect(ctx.lineTo).toHaveBeenCalled(); // Sides
      expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4); // 4 corners
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it('should clamp the radius if it exceeds half the width or height', () => {
      drawRoundRect(ctx, 0, 0, 100, 50, 50); // r=50 is larger than h/2 (25)

      // Expected safe radius = min(50, 50, 25) = 25
      // Verify the first moveTo command starts at safeR
      expect(ctx.moveTo).toHaveBeenCalledWith(25, 0);
    });
  });

  describe('drawPoly', () => {
    it('should draw a polygon with correct number of sides', () => {
      const sides = 6;
      drawPoly(ctx, 50, 50, 20, sides);

      expect(ctx.beginPath).toHaveBeenCalled();
      // First point is moveTo, subsequent are lineTo. Total calls = sides.
      // logic: loop 0 to sides-1. i=0 is moveTo, else lineTo.
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(sides - 1);
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled(); // Default fill=true
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('should stroke instead of fill when fill is false', () => {
      drawPoly(ctx, 50, 50, 20, 3, 0, false);
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should add to path without beginPath/fill if addToPath is true', () => {
      drawPoly(ctx, 50, 50, 20, 6, 0, true, true);
      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('drawStar', () => {
    it('should draw a star with correct spikes', () => {
      const spikes = 5;
      drawStar(ctx, 50, 50, 20, 10, spikes);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      // loop runs `spikes` times. Inside loop: 2 lineTo calls.
      // Plus one final lineTo after loop.
      // Total lineTo = (spikes * 2) + 1
      expect(ctx.lineTo).toHaveBeenCalledTimes((spikes * 2) + 1);
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should stroke instead of fill when fill is false', () => {
      drawStar(ctx, 50, 50, 20, 10, 5, false);
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should add to path without beginPath/fill if addToPath is true', () => {
      drawStar(ctx, 50, 50, 20, 10, 5, true, true);
      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('drawRoughRect', () => {
    it('should apply rotation and fill rect', () => {
      drawRoughRect(ctx, 10, 10, 100, 50);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(60, 35); // x + w/2, y + h/2
      expect(ctx.rotate).toHaveBeenCalledWith(0.02);
      expect(ctx.fillRect).toHaveBeenCalledWith(-50, -25, 100, 50); // -w/2, -h/2
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should use rect instead of fillRect if addToPath is true', () => {
      drawRoughRect(ctx, 10, 10, 100, 50, true);

      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalledWith(-50, -25, 100, 50);
    });
  });

  describe('drawScribble', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Mock random to be deterministic
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should draw a scribble path deterministically', () => {
      drawScribble(ctx, 10, 10, 100);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(60, 60); // x + s/2, y + s/2
      expect(ctx.rotate).toHaveBeenCalledWith(0.1);

      expect(ctx.beginPath).toHaveBeenCalled();
      // Loop runs 8 times. i=0 moveTo, else lineTo.
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(7);

      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
