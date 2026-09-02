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

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScannability } from './useScannability';
import { QRProvider, useQRStore } from '@/context/QRContext';
import { DEFAULT_CONFIG } from '@/constants';
import { QRConfig } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QRProvider, null, children);

const defaultConfig: QRConfig = { ...DEFAULT_CONFIG } as QRConfig;

function makeCanvasRef(): React.RefObject<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  return { current: canvas };
}

// Active worker reference helper from our global mock worker control
const getActiveWorker = () => globalThis.mockWorkerControl.activeWorker;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useScannability - changed behavior: uses useQRStore instead of useQRContext', () => {

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('throws when used outside QRProvider (uses useQRStore)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const canvasRef = makeCanvasRef();
    expect(() =>
      renderHook(() => useScannability(canvasRef, defaultConfig))
    ).toThrow('useQRStore must be used within QRProvider');
    spy.mockRestore();
  });

  it('returns initial status of "idle"', () => {
    const { result } = renderHook(
      () => useScannability(makeCanvasRef(), defaultConfig),
      { wrapper }
    );
    expect(result.current.status).toBe('idle');
  });

  it('emits scannability-fail signal on worker failure message via store.emitSignal', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      result.current.scan.checkScannability();
    });

    // Simulate worker sending a failure
    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: false,
        physicalReady: false,
        error: 'NOT_FOUND',
        configId: '1',
      });
    });

    expect(signalCallback).toHaveBeenCalledTimes(1);
    const detail = signalCallback.mock.calls[0][0];
    expect(detail).toHaveProperty('engine');
    expect(detail).toHaveProperty('styleId');
    expect(detail).toHaveProperty('errorType', 'NOT_FOUND');
  });

  it('does NOT emit scannability-fail signal when worker reports success', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      result.current.scan.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: true,
        physicalReady: true,
        error: null,
        configId: '1',
      });
    });

    expect(signalCallback).not.toHaveBeenCalled();
  });

  it('does NOT emit scannability-fail signal when failure has no error field', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      result.current.scan.checkScannability();
    });

    // success=false but error is falsy - should not emit
    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: false,
        physicalReady: false,
        error: null,
        configId: '1',
      });
    });

    expect(signalCallback).not.toHaveBeenCalled();
  });

  it('status becomes "fail" when worker reports failure', () => {
    const { result } = renderHook(
      () => useScannability(makeCanvasRef(), defaultConfig),
      { wrapper }
    );

    act(() => {
      result.current.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({ success: false, physicalReady: false, error: 'NOT_FOUND', configId: '1' });
    });

    expect(result.current.status).toBe('fail');
  });

  it('status becomes "digital-pass" when worker reports success without physical pass', () => {
    const { result } = renderHook(
      () => useScannability(makeCanvasRef(), defaultConfig),
      { wrapper }
    );

    act(() => {
      result.current.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({ success: true, physicalReady: false, error: null, configId: '1' });
    });

    expect(result.current.status).toBe('digital-pass');
  });

  it('status becomes "physical-pass" when worker reports full success', () => {
    const { result } = renderHook(
      () => useScannability(makeCanvasRef(), defaultConfig),
      { wrapper }
    );

    act(() => {
      result.current.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({ success: true, physicalReady: true, error: null, configId: '1' });
    });

    expect(result.current.status).toBe('physical-pass');
  });

  it('emitted signal detail includes config.style as styleId', () => {
    const configWithStyle: QRConfig = { ...defaultConfig, style: 'circuit' as any };
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), configWithStyle),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      result.current.scan.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({ success: false, physicalReady: false, error: 'DECODE_FAIL', configId: '1' });
    });

    const detail = signalCallback.mock.calls[0][0];
    expect(detail.styleId).toBe('circuit');
    expect(detail.errorType).toBe('DECODE_FAIL');
  });

  it('emitted signal detail styleId falls back to "default" when style is empty', () => {
    const configNoStyle: QRConfig = { ...defaultConfig, style: '' as any };
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), configNoStyle),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      result.current.scan.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({ success: false, physicalReady: false, error: 'FAIL', configId: '1' });
    });

    const detail = signalCallback.mock.calls[0][0];
    expect(detail.styleId).toBe('default');
  });

  it('worker event listener is cleaned up when effect re-runs due to config change', () => {
    const canvasRef = makeCanvasRef();
    const { rerender } = renderHook(
      ({ config }: { config: QRConfig }) => useScannability(canvasRef, config),
      { wrapper, initialProps: { config: defaultConfig } }
    );

    const workerAtMount = getActiveWorker()!;

    // Rerender with different config triggers cleanup and re-registration
    act(() => {
      rerender({ config: { ...defaultConfig, value: 'https://changed.com' } });
    });

    expect(workerAtMount.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  // Regression: previously used [config, emitSignal] as dep array,
  // now uses [config, store]. Verify store changes do not cause spurious re-registrations.
  it('does not re-register worker listener when unrelated store state changes', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const workerAtMount = getActiveWorker()!;
    const initialAddListenerCallCount = workerAtMount.addEventListener.mock.calls.length;

    // Update preferences (unrelated to config or store identity)
    act(() => {
      result.current.store.updatePreferences({ darkMode: true });
    });

    // Store reference is stable (same QRStore instance), config did not change,
    // so useEffect should not re-run and addEventListener should not be called again.
    expect(workerAtMount.addEventListener.mock.calls.length).toBe(initialAddListenerCallCount);
  });

  it('attaches an incremented ID to every analysis request sent to the worker', () => {
    const { result } = renderHook(
      () => useScannability(makeCanvasRef(), defaultConfig),
      { wrapper }
    );

    const mockImageData = {
      data: new Uint8ClampedArray(100),
      width: 5,
      height: 5,
    } as any;

    act(() => {
      result.current.checkScannability(mockImageData);
    });
    expect(getActiveWorker()!.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ configId: '1' }),
      expect.any(Array)
    );

    act(() => {
      result.current.checkScannability(mockImageData);
    });
    expect(getActiveWorker()!.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ configId: '2' }),
      expect.any(Array)
    );
  });

  it('client-side listener drops worker messages that return a stale ID', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    // Send first request (gets ID '1')
    act(() => {
      result.current.scan.checkScannability();
    });

    // Send second request (gets ID '2')
    act(() => {
      result.current.scan.checkScannability();
    });

    // Simulate worker returning a message for ID '1' (stale)
    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: false,
        physicalReady: false,
        error: 'NOT_FOUND',
        configId: '1',
      });
    });

    // The status should remain 'checking' (the current active state status), and NOT change to 'fail'
    expect(result.current.scan.status).toBe('checking');
    expect(signalCallback).not.toHaveBeenCalled();

    // Now return ID '2' (active)
    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: true,
        physicalReady: true,
        error: null,
        configId: '2',
      });
    });

    expect(result.current.scan.status).toBe('physical-pass');
  });

  it('client-side listener drops worker messages that have no ID', () => {
    const { result } = renderHook(
      () => ({
        scan: useScannability(makeCanvasRef(), defaultConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.scan.checkScannability();
    });

    act(() => {
      getActiveWorker()!.dispatchMessage({
        success: true,
        physicalReady: true,
        error: null,
      });
    });

    expect(result.current.scan.status).toBe('checking'); // remains unchanged
  });

  describe('try-catch guard and main-thread fallback', () => {
    let originalWorker: any;

    beforeEach(() => {
      originalWorker = globalThis.Worker;
    });

    afterEach(() => {
      globalThis.Worker = originalWorker;
      vi.restoreAllMocks();
    });

    it('silently catches Worker initialization error', () => {
      globalThis.Worker = class {
        constructor() {
          throw new Error('Worker not supported or blocked');
        }
      } as any;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Component should render without crashing
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      expect(result.current.status).toBe('idle');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('falls back to main-thread processing when Worker is unavailable', async () => {
      globalThis.Worker = class {
        constructor() {
          throw new Error('Worker not supported');
        }
      } as any;

      // Spy on console.error so we don't pollute the logs
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      // Spy on performScannabilityCheck
      const scannabilityCheckerModule = await import('@/packages/scannability');
      const spyCheck = vi.spyOn(scannabilityCheckerModule, 'performScannabilityCheck').mockReturnValue({
        success: true,
        physicalReady: true,
      });

      const mockImageData = {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      } as any;

      await act(async () => {
        result.current.checkScannability(mockImageData);
        // Wait for requestIdleCallback/setTimeout to execute
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(spyCheck).toHaveBeenCalledWith(mockImageData, 10, 10, !!navigator.webdriver, undefined);
      expect(result.current.status).toBe('physical-pass');
    });

    it('emits scannability-fail signal on fallback failure', async () => {
      globalThis.Worker = class {
        constructor() {
          throw new Error('Worker not supported');
        }
      } as any;

      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(
        () => ({
          scan: useScannability(makeCanvasRef(), defaultConfig),
          store: useQRStore(),
        }),
        { wrapper }
      );

      const signalCallback = vi.fn();
      act(() => {
        result.current.store.registerSignal('scannability-fail', signalCallback);
      });

      // Spy on performScannabilityCheck to return a failure
      const scannabilityCheckerModule = await import('@/packages/scannability');
      vi.spyOn(scannabilityCheckerModule, 'performScannabilityCheck').mockReturnValue({
        success: false,
        physicalReady: false,
        error: 'SECURITY_VIOLATION',
      });

      const mockImageData = {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      } as any;

      await act(async () => {
        result.current.scan.checkScannability(mockImageData);
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.current.scan.status).toBe('fail');
      expect(signalCallback).toHaveBeenCalledTimes(1);
      const detail = signalCallback.mock.calls[0][0];
      expect(detail).toHaveProperty('errorType', 'SECURITY_VIOLATION');
    });
  });

  describe('Self-Healing Worker Recovery on crash and subsequent retry', () => {
    it('falls back on the main thread when a worker is unresponsive for 1500ms', async () => {
      vi.useFakeTimers();
      const scannabilityCheckerModule = await import('@/packages/scannability');
      const fallbackSpy = vi.spyOn(scannabilityCheckerModule, 'performScannabilityCheck').mockReturnValue({
        success: true,
        physicalReady: true,
      });

      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );
      const imageData = {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      } as ImageData;

      act(() => {
        result.current.checkScannability(imageData);
      });
      expect(result.current.status).toBe('checking');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(fallbackSpy).toHaveBeenCalledWith(imageData, 10, 10, !!navigator.webdriver, undefined);
      expect(result.current.status).toBe('physical-pass');
      expect(result.current.workerRecoveryActive).toBe(true);
      vi.useRealTimers();
    });

    it('recreates a worker after consecutive watchdog timeouts', async () => {
      vi.useFakeTimers();
      const scannabilityCheckerModule = await import('@/packages/scannability');
      vi.spyOn(scannabilityCheckerModule, 'performScannabilityCheck').mockReturnValue({
        success: true,
        physicalReady: true,
      });
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );
      const worker = getActiveWorker()!;
      const imageData = {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      } as ImageData;

      act(() => result.current.checkScannability(imageData));
      await act(async () => vi.advanceTimersByTimeAsync(1500));
      act(() => result.current.checkScannability(imageData));
      await act(async () => vi.advanceTimersByTimeAsync(1500));

      expect(worker.terminate).toHaveBeenCalledTimes(1);
      expect(getActiveWorker()).not.toBe(worker);
    });

    it('resolves the active checking state when the worker acknowledges a dropped request', () => {
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      act(() => {
        result.current.checkScannability({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        } as ImageData);
      });

      act(() => {
        getActiveWorker()!.dispatchMessage({ configId: '1', dropped: true });
      });

      expect(result.current.status).toBe('idle');
    });

    it('retries with main-thread image data when worker canvas extraction is unavailable', () => {
      const canvasRef = makeCanvasRef();
      const { result } = renderHook(
        () => useScannability(canvasRef, defaultConfig),
        { wrapper }
      );
      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn();

      act(() => {
        result.current.checkScannability(undefined, {
          width: 10,
          height: 10,
          close: vi.fn(),
        } as unknown as ImageBitmap, 21);
      });

      act(() => {
        worker.dispatchMessage({ configId: '1', retryWithImageData: true });
      });

      expect(worker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
        configId: '1',
        imageData: expect.objectContaining({ width: 100, height: 100 }),
        moduleCount: 21,
      }));
    });

    it('handles worker runtime crash, transitions to fail, shows recovery warning, and then heals on next check', async () => {
      const { result } = renderHook(
        () => ({
          scan: useScannability(makeCanvasRef(), defaultConfig),
          store: useQRStore(),
        }),
        { wrapper }
      );

      const signalCallback = vi.fn();
      act(() => {
        result.current.store.registerSignal('scannability-fail', signalCallback);
      });

      // 1. Trigger initial check
      act(() => {
        result.current.scan.checkScannability();
      });

      expect(result.current.scan.status).toBe('checking');
      expect(result.current.scan.workerRecoveryActive).toBe(false);

      const worker1 = getActiveWorker()!;
      expect(worker1).not.toBeNull();

      // 2. Simulate worker crash/error
      act(() => {
        worker1.dispatchError(new Error('Worker runtime exception'));
      });

      // The status should transition immediately to 'fail'
      expect(result.current.scan.status).toBe('fail');
      // A diagnostic warning is displayed / active
      expect(result.current.scan.workerRecoveryActive).toBe(true);
      // The worker is terminated
      expect(worker1.terminate).toHaveBeenCalled();
      // Emitted scannability-fail signal
      expect(signalCallback).toHaveBeenCalledTimes(1);
      expect(signalCallback.mock.calls[0][0]).toHaveProperty('errorType', 'WORKER_ERROR');

      // 3. Trigger subsequent verification request (retry)
      act(() => {
        result.current.scan.checkScannability();
      });

      // It should instantly spin up a fresh worker thread (different from the first)
      const worker2 = getActiveWorker()!;
      expect(worker2).not.toBeNull();
      expect(worker2).not.toBe(worker1);

      // Status goes to checking
      expect(result.current.scan.status).toBe('checking');

      // Simulate the fresh worker succeeding
      act(() => {
        worker2.dispatchMessage({
          success: true,
          physicalReady: true,
          error: null,
          configId: '2',
        });
      });

      // Result is successful
      expect(result.current.scan.status).toBe('physical-pass');
      // Worker recovery active is reset to false since the worker is now healthy and successfully processed the check
      expect(result.current.scan.workerRecoveryActive).toBe(false);
    });
  });

  describe('Asynchronous ImageBitmap & Backpressure optimizations', () => {
    it('supports direct ImageBitmap checking if overrideImageBitmap is provided', () => {
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn();

      const mockImageBitmap = {
        width: 100,
        height: 100,
        close: vi.fn(),
      } as unknown as ImageBitmap;

      act(() => {
        result.current.checkScannability(undefined, mockImageBitmap);
      });

      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          imageBitmap: mockImageBitmap,
          width: 100,
          height: 100,
        }),
        [mockImageBitmap]
      );
    });

    it('drops/skips subsequent frames when the background worker is busy and previous latency exceeded frame interval', () => {
      let mockTime = 0;
      const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const mockImageData = {
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      } as unknown as ImageData;

      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn();

      // Trigger first check
      mockTime = 0;
      act(() => {
        result.current.checkScannability(mockImageData);
      });

      expect(worker.postMessage).toHaveBeenCalledTimes(1);

      // Simulate first check completing after 50ms
      mockTime = 50;
      act(() => {
        worker.dispatchMessage({
          success: true,
          physicalReady: true,
          error: null,
          configId: '1',
        });
      });

      // Now, latency is 50ms (> 16.6ms)

      // Start second check
      mockTime = 60;
      act(() => {
        result.current.checkScannability(mockImageData);
      });

      expect(worker.postMessage).toHaveBeenCalledTimes(2);

      // Try triggering a third check synchronously (while second is busy)
      mockTime = 70;
      act(() => {
        result.current.checkScannability(mockImageData);
      });

      // Since worker is busy and latency is 50ms (> 16.6ms), it should skip!
      // Therefore, postMessage should NOT be called a third time.
      expect(worker.postMessage).toHaveBeenCalledTimes(2);

      nowSpy.mockRestore();
    });
  });

  describe('Deterministic Resource Scoping & Cleanup', () => {
    it('frees image handles when main-thread backpressure drops a scannability verification request', () => {
      let mockTime = 0;
      const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn();

      // Send initial check
      const initialBitmap = { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap;
      mockTime = 0;
      act(() => {
        result.current.checkScannability(undefined, initialBitmap);
      });

      // Simulate 50ms latency response
      mockTime = 50;
      act(() => {
        worker.dispatchMessage({
          success: true,
          physicalReady: true,
          configId: '1',
        });
      });

      // Start another check so worker is busy
      const busyBitmap = { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap;
      mockTime = 60;
      act(() => {
        result.current.checkScannability(undefined, busyBitmap);
      });

      // Try to check again while worker is busy and latency is high
      const droppedBitmap = { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap;
      mockTime = 70;
      act(() => {
        result.current.checkScannability(undefined, droppedBitmap);
      });

      // The dropped bitmap MUST be closed by backpressure guard
      expect(droppedBitmap.close).toHaveBeenCalledTimes(1);

      nowSpy.mockRestore();
    });

    it('frees image handles when worker dispatch fails due to validation or postMessage exceptions', () => {
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn().mockImplementation(() => {
        throw new Error('DataCloneError: message serialization failed');
      });

      const mockImageBitmap = { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap;

      act(() => {
        result.current.checkScannability(undefined, mockImageBitmap);
      });

      expect(mockImageBitmap.close).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('fail');
    });

    it('frees image handles in main-thread fallback mode across completed checks and bypassed runs', async () => {
      const originalWorker = globalThis.Worker;
      delete (globalThis as any).Worker;

      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const mockImageBitmap1 = { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap;

      await act(async () => {
        result.current.checkScannability(undefined, mockImageBitmap1);
        await new Promise((r) => setTimeout(r, 150));
      });

      expect(mockImageBitmap1.close).toHaveBeenCalledTimes(1);

      globalThis.Worker = originalWorker;
    });

    it('maintains zero memory leak across 1,000 rapid cycles of parameter adjustments', () => {
      const { result } = renderHook(
        () => useScannability(makeCanvasRef(), defaultConfig),
        { wrapper }
      );

      const worker = getActiveWorker()!;
      worker.postMessage = vi.fn();

      const createdBitmaps: { width: number; height: number; close: any }[] = [];

      for (let i = 0; i < 1000; i++) {
        const bitmap = { width: 10, height: 10, close: vi.fn() };
        createdBitmaps.push(bitmap);
        act(() => {
          result.current.checkScannability(undefined, bitmap as unknown as ImageBitmap);
        });
      }

      // Verify that every bitmap created was either transferred to worker or closed via backpressure/error cleanup
      const closedCount = createdBitmaps.filter((b) => b.close.mock.calls.length > 0).length;
      const transferredCount = (worker.postMessage as any).mock.calls.length;

      expect(closedCount + transferredCount).toBe(1000);
    });
  });
});

