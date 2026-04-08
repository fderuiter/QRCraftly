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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SOCIAL_DIMENSIONS,
  getAspectRatioCss,
  drawWithTemplate,
} from './templateRenderer';
import { DEFAULT_CONFIG } from '../constants';
import { SocialFormat, TemplateStyle, QRConfig } from '../types';
import * as qrRenderer from './qrRenderer';

// ---------------------------------------------------------------------------
// SOCIAL_DIMENSIONS
// ---------------------------------------------------------------------------
describe('SOCIAL_DIMENSIONS', () => {
  it('maps SQUARE_1_1 to 1080x1080', () => {
    expect(SOCIAL_DIMENSIONS[SocialFormat.SQUARE_1_1]).toEqual({ width: 1080, height: 1080 });
  });

  it('maps PORTRAIT_4_5 to 1080x1350', () => {
    expect(SOCIAL_DIMENSIONS[SocialFormat.PORTRAIT_4_5]).toEqual({ width: 1080, height: 1350 });
  });

  it('maps STORY_9_16 to 1080x1920', () => {
    expect(SOCIAL_DIMENSIONS[SocialFormat.STORY_9_16]).toEqual({ width: 1080, height: 1920 });
  });

  it('has aspect ratios matching their names', () => {
    const square = SOCIAL_DIMENSIONS[SocialFormat.SQUARE_1_1];
    expect(square.width / square.height).toBeCloseTo(1);

    const portrait = SOCIAL_DIMENSIONS[SocialFormat.PORTRAIT_4_5];
    expect(portrait.width / portrait.height).toBeCloseTo(4 / 5, 2);

    const story = SOCIAL_DIMENSIONS[SocialFormat.STORY_9_16];
    expect(story.width / story.height).toBeCloseTo(9 / 16, 2);
  });
});

// ---------------------------------------------------------------------------
// getAspectRatioCss
// ---------------------------------------------------------------------------
describe('getAspectRatioCss', () => {
  it('returns "1080/1080" for SQUARE_1_1', () => {
    expect(getAspectRatioCss(SocialFormat.SQUARE_1_1)).toBe('1080/1080');
  });

  it('returns "1080/1350" for PORTRAIT_4_5', () => {
    expect(getAspectRatioCss(SocialFormat.PORTRAIT_4_5)).toBe('1080/1350');
  });

  it('returns "1080/1920" for STORY_9_16', () => {
    expect(getAspectRatioCss(SocialFormat.STORY_9_16)).toBe('1080/1920');
  });
});

// ---------------------------------------------------------------------------
// drawWithTemplate – verifies drawQRInternal is called with correct bounding box
// ---------------------------------------------------------------------------

/**
 * Builds a minimal mock 2D context that records translate/scale calls and
 * satisfies the subset used by drawWithTemplate.
 */
function makeMockCtx() {
  const calls: Array<{ method: string; args: number[] }> = [];

  const ctx = {
    _calls: calls,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    save: vi.fn(() => calls.push({ method: 'save', args: [] })),
    restore: vi.fn(() => calls.push({ method: 'restore', args: [] })),
    translate: vi.fn((x: number, y: number) => calls.push({ method: 'translate', args: [x, y] })),
    scale: vi.fn((sx: number, sy: number) => calls.push({ method: 'scale', args: [sx, sy] })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;

  return ctx;
}

/** Minimal QRModules stub */
function makeModules(size = 21) {
  return {
    size,
    get: (_r: number, _c: number) => false,
  };
}

describe('drawWithTemplate', () => {
  let drawQRInternalSpy: ReturnType<typeof vi.spyOn>;
  const baseConfig: QRConfig = {
    ...(DEFAULT_CONFIG as QRConfig),
    socialFormat: SocialFormat.SQUARE_1_1,
    templateStyle: TemplateStyle.NONE,
  };

  beforeEach(() => {
    drawQRInternalSpy = vi.spyOn(qrRenderer, 'drawQRInternal').mockImplementation(vi.fn());
  });

  it('calls drawQRInternal exactly once', () => {
    const ctx = makeMockCtx();
    const modules = makeModules();
    drawWithTemplate(ctx, modules, baseConfig, null, null, 1080, 1080, modules.size);
    expect(drawQRInternalSpy).toHaveBeenCalledTimes(1);
  });

  it('calls save() before and restore() after drawQRInternal', () => {
    const ctx = makeMockCtx();
    const modules = makeModules();
    drawWithTemplate(ctx, modules, baseConfig, null, null, 1080, 1080, modules.size);

    const saveIdx = (ctx as any)._calls.findIndex((c: any) => c.method === 'save');
    const restoreIdx = (ctx as any)._calls.findIndex((c: any) => c.method === 'restore');

    expect(saveIdx).toBeGreaterThanOrEqual(0);
    expect(restoreIdx).toBeGreaterThan(saveIdx);
  });

  it('translates to (0, 0) for NONE + SQUARE (fills entire canvas)', () => {
    const ctx = makeMockCtx();
    const modules = makeModules();
    drawWithTemplate(ctx, modules, baseConfig, null, null, 1080, 1080, modules.size);

    const translateCall = (ctx as any)._calls.find((c: any) => c.method === 'translate');
    expect(translateCall).toBeDefined();
    expect(translateCall.args[0]).toBeCloseTo(0);
    expect(translateCall.args[1]).toBeCloseTo(0);
  });

  it('centres the QR bounding box for a non-square canvas (STORY_9_16, MINIMALIST)', () => {
    const config: QRConfig = {
      ...baseConfig,
      socialFormat: SocialFormat.STORY_9_16,
      templateStyle: TemplateStyle.MINIMALIST,
    };
    const ctx = makeMockCtx();
    const modules = makeModules();

    const displayWidth = 1080;
    const displayHeight = 1920;
    drawWithTemplate(ctx, modules, config, null, null, displayWidth, displayHeight, modules.size);

    const qrSize = displayWidth * 0.5; // 540
    const expectedX = (displayWidth - qrSize) / 2; // 270
    const expectedY = (displayHeight - qrSize) / 2; // 690

    const translateCall = (ctx as any)._calls.find((c: any) => c.method === 'translate');
    expect(translateCall).toBeDefined();
    expect(translateCall.args[0]).toBeCloseTo(expectedX, 0);
    expect(translateCall.args[1]).toBeCloseTo(expectedY, 0);
  });

  it('passes the correct scale factor to ctx.scale()', () => {
    const config: QRConfig = {
      ...baseConfig,
      socialFormat: SocialFormat.STORY_9_16,
      templateStyle: TemplateStyle.MINIMALIST,
    };
    const ctx = makeMockCtx();
    const modules = makeModules();

    const displayWidth = 1080;
    const displayHeight = 1920;
    drawWithTemplate(ctx, modules, config, null, null, displayWidth, displayHeight, modules.size);

    const expectedScale = (displayWidth * 0.5) / displayWidth; // 0.5

    const scaleCall = (ctx as any)._calls.find((c: any) => c.method === 'scale');
    expect(scaleCall).toBeDefined();
    expect(scaleCall.args[0]).toBeCloseTo(expectedScale, 5);
    expect(scaleCall.args[1]).toBeCloseTo(expectedScale, 5);
  });

  it('passes logo images through to drawQRInternal', () => {
    const logoImg = { src: 'data:image/png;base64,abc' } as unknown as HTMLImageElement;
    const borderLogoImg = { src: 'data:image/png;base64,def' } as unknown as HTMLImageElement;
    const ctx = makeMockCtx();
    const modules = makeModules();

    drawWithTemplate(ctx, modules, baseConfig, logoImg, borderLogoImg, 1080, 1080, modules.size);

    expect(drawQRInternalSpy).toHaveBeenCalledWith(
      expect.anything(),
      modules,
      baseConfig,
      logoImg,
      borderLogoImg,
      expect.any(Number),
      modules.size
    );
  });
});
