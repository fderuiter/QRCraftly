/**
 * Camera-frame decoding (#1096): one bounded jsQR pass per frame, rotating strategies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderCorpusFrame } from '../../../../tests/utils/scannerCorpus';
import { cameraStrategyFor, decodeCameraFrame, estimateNoise, type CameraDecodeStrategy } from '../index';

const jsQRCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock('jsqr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jsqr')>();
  const counted = (...args: Parameters<typeof actual.default>) => {
    jsQRCalls.count += 1;
    return actual.default(...args);
  };
  return { default: counted };
});

const TEXT = 'https://qrcraftly.com/camera-decode';
const STRATEGIES: CameraDecodeStrategy[] = ['centre', 'frame', 'inverted'];

/** Runs the rotation for up to `frames` frames and returns the first decode. */
function decodeWithin(frame: { data: Uint8ClampedArray; width: number; height: number }, frames: number) {
  for (let sequenceId = 1; sequenceId <= frames; sequenceId++) {
    const decoded = decodeCameraFrame(frame.data, frame.width, frame.height, cameraStrategyFor(sequenceId));
    if (decoded) return { decoded, sequenceId };
  }
  return { decoded: null, sequenceId: frames };
}

describe('camera-frame decoding', () => {
  beforeEach(() => {
    jsQRCalls.count = 0;
  });

  it('runs at most one jsQR pass on a frame with no code, whatever the strategy', () => {
    const empty = renderCorpusFrame({ text: null });
    for (const pass of STRATEGIES) {
      jsQRCalls.count = 0;
      expect(decodeCameraFrame(empty.data, empty.width, empty.height, pass)).toBeNull();
      expect(jsQRCalls.count).toBe(1);
    }
  });

  it('runs one pass on a grainy low-light frame too', () => {
    const grainy = renderCorpusFrame({ text: null, noise: 20 });
    expect(decodeCameraFrame(grainy.data, grainy.width, grainy.height, 'centre')).toBeNull();
    expect(jsQRCalls.count).toBe(1);
  });

  it('rotates centre crop, whole frame and an inverted pass across frames', () => {
    expect([1, 2, 3, 4, 5].map(cameraStrategyFor)).toEqual(['centre', 'frame', 'centre', 'inverted', 'centre']);
  });

  it('decodes a code in the centre on the first frame', () => {
    const frame = renderCorpusFrame({ text: TEXT, modulePx: 2 });
    expect(decodeWithin(frame, 1)).toEqual({ decoded: TEXT, sequenceId: 1 });
  });

  it('decodes an inverted code within one rotation', () => {
    const frame = renderCorpusFrame({ text: TEXT, invert: true });
    expect(decodeWithin(frame, 4).decoded).toBe(TEXT);
  });

  it('decodes a code through sensor noise', () => {
    const frame = renderCorpusFrame({ text: TEXT, noise: 14 });
    expect(decodeWithin(frame, 4).decoded).toBe(TEXT);
  });

  it('decodes a code away from the centre with the whole-frame pass', () => {
    const frame = renderCorpusFrame({ text: TEXT, modulePx: 4, width: 1280, height: 720 });
    // Shift the code to the left edge, outside the centre square.
    const shifted = new Uint8ClampedArray(frame.data.length).fill(128);
    for (let y = 0; y < frame.height; y++) {
      const row = y * frame.width * 4;
      shifted.set(frame.data.subarray(row + 400 * 4, row + frame.width * 4), row);
    }
    expect(decodeCameraFrame(shifted, frame.width, frame.height, 'centre')).toBeNull();
    expect(decodeCameraFrame(shifted, frame.width, frame.height, 'frame')).toBe(TEXT);
  });

  it('estimates sensor noise from neighbouring pixels', () => {
    const clean = renderCorpusFrame({ text: TEXT });
    const grainy = renderCorpusFrame({ text: TEXT, noise: 14 });
    expect(estimateNoise(clean.data, clean.width, clean.height)).toBe(0);
    expect(estimateNoise(grainy.data, grainy.width, grainy.height)).toBeGreaterThanOrEqual(6);
  });
});
