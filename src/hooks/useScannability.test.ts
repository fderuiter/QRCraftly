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
// Worker mock that lets us control message dispatching
// ---------------------------------------------------------------------------
type WorkerMessageHandler = (e: MessageEvent) => void;

// Keep a reference to the most-recently created worker instance
let activeWorker: MockWorkerInstance | null = null;

class MockWorkerInstance {
  private handlers: WorkerMessageHandler[] = [];
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn((_event: string, handler: WorkerMessageHandler) => {
    this.handlers.push(handler);
  });
  removeEventListener = vi.fn((_event: string, handler: WorkerMessageHandler) => {
    this.handlers = this.handlers.filter(h => h !== handler);
  });
  dispatchMessage(data: any) {
    this.handlers.forEach(h => h({ data } as MessageEvent));
  }
}

// A proper constructor function that records the created instance
function MockWorkerConstructor(this: MockWorkerInstance) {
  const inst = new MockWorkerInstance();
  activeWorker = inst;
  Object.assign(this, inst);
  // Copy prototype methods
  (this as any).dispatchMessage = inst.dispatchMessage.bind(inst);
  (this as any).addEventListener = inst.addEventListener.bind(inst);
  (this as any).removeEventListener = inst.removeEventListener.bind(inst);
  (this as any).postMessage = inst.postMessage.bind(inst);
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useScannability - changed behavior: uses useQRStore instead of useQRContext', () => {
  const OriginalWorker = globalThis.Worker;

  beforeEach(() => {
    window.localStorage.clear();
    activeWorker = null;
    // Replace the global Worker with our controllable constructor
    globalThis.Worker = MockWorkerConstructor as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.Worker = OriginalWorker;
    window.localStorage.clear();
    activeWorker = null;
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
      activeWorker!.dispatchMessage({
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
      activeWorker!.dispatchMessage({
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
      activeWorker!.dispatchMessage({
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
      activeWorker!.dispatchMessage({ success: false, physicalReady: false, error: 'NOT_FOUND', configId: '1' });
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
      activeWorker!.dispatchMessage({ success: true, physicalReady: false, error: null, configId: '1' });
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
      activeWorker!.dispatchMessage({ success: true, physicalReady: true, error: null, configId: '1' });
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
      activeWorker!.dispatchMessage({ success: false, physicalReady: false, error: 'DECODE_FAIL', configId: '1' });
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
      activeWorker!.dispatchMessage({ success: false, physicalReady: false, error: 'FAIL', configId: '1' });
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

    const workerAtMount = activeWorker!;

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

    const workerAtMount = activeWorker!;
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
    expect(activeWorker!.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ configId: '1' }),
      expect.any(Array)
    );

    act(() => {
      result.current.checkScannability(mockImageData);
    });
    expect(activeWorker!.postMessage).toHaveBeenLastCalledWith(
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
      activeWorker!.dispatchMessage({
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
      activeWorker!.dispatchMessage({
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
      activeWorker!.dispatchMessage({
        success: true,
        physicalReady: true,
        error: null,
      });
    });

    expect(result.current.scan.status).toBe('checking'); // remains unchanged
  });
});