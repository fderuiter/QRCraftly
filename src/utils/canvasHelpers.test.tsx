import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from './canvasHelpers';

describe('canvasHelpers', () => {
  let ctx: any;
  let mockRoundRec: any;

  beforeEach(() => {
    // Create a mock context with spy methods for drawing commands
    mockRoundRec = vi.fn();
    ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillRect: vi.fn(),
        // mock roundRect specifically
        roundRect: mockRoundRec,
    };
  });

  describe('drawRoundRect', () => {
    it('should use native roundRect if available', () => {
        // Mock context has roundRect
        drawRoundRect(ctx, 10, 20, 100, 50, 5);
        expect(mockRoundRec).toHaveBeenCalledWith(10, 20, 100, 50, 5);
        expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('should fallback to path drawing if roundRect is not available', () => {
        // Remove roundRect from context
        const ctxNoRR = { ...ctx };
        delete ctxNoRR.roundRect;

        drawRoundRect(ctxNoRR, 10, 20, 100, 50, 5);
        expect(ctxNoRR.beginPath).toHaveBeenCalled();
        expect(ctxNoRR.moveTo).toHaveBeenCalledWith(15, 20); // x + r, y
        // We could assert all lineTo/quadraticCurveTo calls but checking a few key ones validates the fallback path logic
        expect(ctxNoRR.quadraticCurveTo).toHaveBeenCalledTimes(4); // 4 corners
        expect(ctxNoRR.closePath).toHaveBeenCalled();
    });
  });

  describe('drawPoly', () => {
    it('should draw a polygon with correct number of sides', () => {
        drawPoly(ctx, 50, 50, 20, 6, 0, true);
        expect(ctx.beginPath).toHaveBeenCalled();
        // 6 sides means 1 moveTo + 5 lineTo calls = 6 points defined in loop (wait, i=0 is moveTo, i=1..5 are lineTo)
        // Actually, the loop runs 'sides' times.
        // i=0: moveTo
        // i=1..5: lineTo
        // Total 1 moveTo + 5 lineTo.
        expect(ctx.moveTo).toHaveBeenCalledTimes(1);
        expect(ctx.lineTo).toHaveBeenCalledTimes(5);
        expect(ctx.closePath).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('should stroke instead of fill when fill is false', () => {
        drawPoly(ctx, 50, 50, 20, 3, 0, false);
        expect(ctx.stroke).toHaveBeenCalled();
        expect(ctx.fill).not.toHaveBeenCalled();
    });
  });

  describe('drawStar', () => {
    it('should draw a star with correct number of spikes', () => {
        const spikes = 5;
        drawStar(ctx, 100, 100, 30, 15, spikes, true);
        expect(ctx.beginPath).toHaveBeenCalled();
        // The loop runs 'spikes' times. Inside loop: 2 lineTo calls.
        // Before loop: 1 moveTo.
        // After loop: 1 lineTo.
        // Total lineTo = spikes * 2 + 1 = 11.
        expect(ctx.moveTo).toHaveBeenCalledTimes(1);
        expect(ctx.lineTo).toHaveBeenCalledTimes(spikes * 2 + 1);
        expect(ctx.closePath).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('drawRoughRect', () => {
      it('should save, translate, rotate, fillRect, and restore', () => {
          drawRoughRect(ctx, 10, 10, 50, 50);
          expect(ctx.save).toHaveBeenCalled();
          expect(ctx.translate).toHaveBeenCalledWith(35, 35); // x + w/2, y + h/2
          expect(ctx.rotate).toHaveBeenCalledWith(0.02);
          expect(ctx.fillRect).toHaveBeenCalledWith(-25, -25, 50, 50);
          expect(ctx.restore).toHaveBeenCalled();
      });
  });

  describe('drawScribble', () => {
      it('should draw a scribble shape', () => {
        // Scribble uses Math.random, so exact coordinates are unpredictable,
        // but we can verify the drawing sequence.
        drawScribble(ctx, 100, 100, 40);
        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.translate).toHaveBeenCalledWith(120, 120); // x + s/2, y + s/2
        expect(ctx.rotate).toHaveBeenCalledWith(0.1);
        expect(ctx.beginPath).toHaveBeenCalled();
        // Loop runs 8 times. i=0 is moveTo, i=1..7 are lineTo.
        expect(ctx.moveTo).toHaveBeenCalledTimes(1);
        expect(ctx.lineTo).toHaveBeenCalledTimes(7);
        expect(ctx.closePath).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
      });
  });

});
