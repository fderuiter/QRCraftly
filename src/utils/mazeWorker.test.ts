import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  isMazeWorkerRequest,
  assertMazeWorkerRequest,
  isMazeWorkerResponse,
  assertMazeWorkerResponse,
} from './mazeContract';
import { QRStyle, QRType, QRErrorCorrectionLevel } from '../types';

describe('Maze Worker & Contract Validation', () => {
  let workerHandler: any;
  let originalPostMessage: any;

  beforeAll(async () => {
    // Dynamically import once to set self.onmessage and capture it
    await import('./mazeWorker');
    workerHandler = (globalThis as any).onmessage;
  });

  beforeEach(() => {
    originalPostMessage = (globalThis as any).postMessage;
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).postMessage = originalPostMessage;
  });

  const baseConfig = {
    value: 'https://qrcraftly.com',
    type: QRType.URL,
    fgColor: '#000000',
    bgColor: '#ffffff',
    style: QRStyle.STANDARD,
    logoUrl: null,
    logoSize: 0.2,
    logoPaddingStyle: 'none' as const,
    logoPadding: 0,
    logoBackgroundColor: '#ffffff',
    eyeColor: '#000000',
    errorCorrectionLevel: QRErrorCorrectionLevel.H,
    isBorderEnabled: false,
    borderSize: 0.05,
    borderColor: '#000000',
    borderStyle: 'solid' as const,
    borderText: '',
    borderTextPosition: 'bottom-center' as const,
    borderTextColor: '#ffffff',
    borderLogoUrl: null,
    borderLogoPosition: 'bottom-center' as const,
    isMazeEnabled: true,
    mazeColor: '#3b82f6',
    showMazeSolution: true,
  } as any;

  const createDummyRequest = (sequenceId = 1) => {
    const size = 21;
    const matrix = new Uint8Array(size * size); // all empty modules/light
    return {
      size,
      matrix,
      config: baseConfig,
      sequenceId,
    };
  };

  describe('Contract Schema Guards & Assertions', () => {
    it('validates a valid MazeWorkerRequest', () => {
      const req = createDummyRequest();
      expect(isMazeWorkerRequest(req)).toBe(true);
      expect(() => assertMazeWorkerRequest(req)).not.toThrow();
    });

    it('flags an invalid MazeWorkerRequest structure', () => {
      const invalidReq = { size: 'invalid', matrix: null, config: {}, sequenceId: 1 };
      expect(isMazeWorkerRequest(invalidReq)).toBe(false);
      expect(() => assertMazeWorkerRequest(invalidReq)).toThrow('Invalid MazeWorkerRequest');
    });

    it('validates a valid MazeWorkerResponse', () => {
      const res = {
        status: 'success' as const,
        sequenceId: 42,
        mazeData: {
          nodes: [],
          edges: [],
          start: null,
          end: null,
          solution: [],
        },
      };
      expect(isMazeWorkerResponse(res)).toBe(true);
      expect(() => assertMazeWorkerResponse(res)).not.toThrow();
    });

    it('flags an invalid MazeWorkerResponse structure', () => {
      const invalidRes = { status: 'wrong-status', sequenceId: 'not-number' };
      expect(isMazeWorkerResponse(invalidRes)).toBe(false);
      expect(() => assertMazeWorkerResponse(invalidRes)).toThrow('Invalid MazeWorkerResponse');
    });
  });

  describe('Worker Thread Execution Flows', () => {
    it('sets self.onmessage and processes maze generation request successfully', async () => {
      const postMessageSpy = vi.fn();
      (globalThis as any).postMessage = postMessageSpy;

      expect(workerHandler).toBeDefined();

      // Trigger worker handler
      await workerHandler({ data: createDummyRequest(1) } as MessageEvent);

      expect(postMessageSpy).toHaveBeenCalled();
      const firstCallArg = postMessageSpy.mock.calls[0][0];
      expect(firstCallArg.status).toBe('success');
      expect(firstCallArg.sequenceId).toBe(1);
      expect(firstCallArg.mazeData).toBeDefined();
      expect(firstCallArg.mazeData.solution.length).toBeGreaterThan(1);
    });

    it('handles runtime error during validation of bad payload gracefully', async () => {
      const postMessageSpy = vi.fn();
      (globalThis as any).postMessage = postMessageSpy;

      // Trigger with bad request payload
      await workerHandler({ data: { invalidPayload: true } } as MessageEvent);

      expect(postMessageSpy).toHaveBeenCalled();
      const firstCallArg = postMessageSpy.mock.calls[0][0];
      expect(firstCallArg.status).toBe('error');
      expect(firstCallArg.error).toBeDefined();
    });

    it('cooperatively cancels older execution sequences when a newer sequenceId is received', async () => {
      const postMessageSpy = vi.fn();
      (globalThis as any).postMessage = postMessageSpy;

      // Dispatch multiple requests with incremental sequenceIds
      const firstPromise = workerHandler({ data: createDummyRequest(101) } as MessageEvent);
      const secondPromise = workerHandler({ data: createDummyRequest(102) } as MessageEvent);

      await Promise.all([firstPromise, secondPromise]);

      // Only sequenceId 102 should post back because 101 is obsolete and cancelled/aborted
      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const postArg = postMessageSpy.mock.calls[0][0];
      expect(postArg.status).toBe('success');
      expect(postArg.sequenceId).toBe(102);
    });
  });
});
