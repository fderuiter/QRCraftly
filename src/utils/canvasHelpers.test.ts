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
import { traceRoundRect, tracePoly, traceStar, traceRoughRect, traceScribble } from './canvasHelpers';

describe('canvasHelpers', () => {
  let ctx: any;

  beforeEach(() => {
    // specific cast to allow optional methods like roundRect
    ctx = {
      roundRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
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

  describe('traceRoundRect', () => {
    it('should use native roundRect if available', () => {
      traceRoundRect(ctx, 10, 20, 100, 50, 5);
      expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 100, 50, 5);
      // Fallback methods should not be called
      expect(ctx.moveTo).not.toHaveBeenCalled();
      expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    });

    it('should fallback to path commands if roundRect is missing', () => {
      // Simulate missing API support
      ctx.roundRect = undefined;

      traceRoundRect(ctx, 10, 20, 100, 50, 5);

      // Verify the manual path construction
      expect(ctx.moveTo).toHaveBeenCalled(); // Starting point
      expect(ctx.lineTo).toHaveBeenCalled(); // Sides
      expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4); // 4 corners
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('tracePoly', () => {
    it('should trace a polygon with correct number of sides', () => {
      const sides = 6;
      tracePoly(ctx, 50, 50, 20, sides);

      // Should define path but NOT start/end it (that's the caller's job now)
      // Actually, trace functions assume an open path or are part of one.
      // But they shouldn't call beginPath/fill.
      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();

      // First point is moveTo, subsequent are lineTo. Total calls = sides.
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(sides - 1);
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('traceStar', () => {
    it('should trace a star with correct spikes', () => {
      const spikes = 5;
      traceStar(ctx, 50, 50, 20, 10, spikes);

      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();

      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      // loop runs `spikes` times. Inside loop: 2 lineTo calls.
      // Plus one final lineTo after loop.
      // Total lineTo = (spikes * 2) + 1
      expect(ctx.lineTo).toHaveBeenCalledTimes((spikes * 2) + 1);
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('traceRoughRect', () => {
    it('should trace a rotated rect using context transforms', () => {
      traceRoughRect(ctx, 10, 10, 100, 50);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(60, 35); // x + w/2, y + h/2
      expect(ctx.rotate).toHaveBeenCalledWith(0.02);

      // Should use rect() to trace, not fillRect()
      expect(ctx.rect).toHaveBeenCalledWith(-50, -25, 100, 50);
      expect(ctx.fillRect).not.toHaveBeenCalled();

      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('traceScribble', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Mock random to be deterministic
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should trace a scribble path deterministically', () => {
      traceScribble(ctx, 10, 10, 100);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(60, 60); // x + s/2, y + s/2
      expect(ctx.rotate).toHaveBeenCalledWith(0.1);

      // Should not call beginPath/fill
      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();

      // Loop runs 8 times. i=0 moveTo, else lineTo.
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(7);

      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
