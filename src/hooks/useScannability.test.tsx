import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QRProvider, useQRStore } from '@/context/QRContext';
import { useScannability } from './useScannability';
import { DEFAULT_CONFIG } from '@/constants';

// ---------------------------------------------------------------------------
// The key change in this PR: useScannability now calls store.emitSignal
// instead of the destructured emitSignal from useQRContext.
// Tests focus on verifying that the store's emitSignal is used correctly.
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

// ---------------------------------------------------------------------------
// Worker simulation helpers
// ---------------------------------------------------------------------------

type WorkerMessageHandler = (e: MessageEvent) => void;
let capturedMessageHandler: WorkerMessageHandler | null = null;
let mockRemoveEventListener: ReturnType<typeof vi.fn>;

// Worker mock MUST be a proper constructor (not arrow fn) for `new Worker()` to work.
function buildWorkerClass() {
  const removeEventListenerMock = vi.fn();
  mockRemoveEventListener = removeEventListenerMock;

  class MockWorker {
    addEventListener(event: string, handler: WorkerMessageHandler) {
      if (event === 'message') {
        capturedMessageHandler = handler;
      }
    }
    removeEventListener(event: string, handler: WorkerMessageHandler) {
      removeEventListenerMock(event, handler);
    }
    postMessage() {}
    terminate() {}
  }

  return MockWorker;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useScannability – store.emitSignal integration', () => {
  const canvasRef = { current: null as HTMLCanvasElement | null };

  beforeEach(() => {
    capturedMessageHandler = null;
    (globalThis as any).Worker = buildWorkerClass();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls store.emitSignal("scannability-fail") when worker reports failure', () => {
    const { result } = renderHook(
      () => ({
        scannability: useScannability(canvasRef, DEFAULT_CONFIG),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    // Simulate worker returning failure
    act(() => {
      capturedMessageHandler?.({
        data: { success: false, physicalReady: false, error: 'NOT_FOUND' },
      } as MessageEvent);
    });

    expect(signalCallback).toHaveBeenCalledTimes(1);
    const detail = signalCallback.mock.calls[0][0];
    expect(detail).toHaveProperty('engine');
    expect(detail).toHaveProperty('styleId');
    expect(detail).toHaveProperty('errorType', 'NOT_FOUND');
  });

  it('does NOT call emitSignal when worker reports success', () => {
    const { result } = renderHook(
      () => ({
        scannability: useScannability(canvasRef, DEFAULT_CONFIG),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      capturedMessageHandler?.({
        data: { success: true, physicalReady: true, error: null },
      } as MessageEvent);
    });

    expect(signalCallback).not.toHaveBeenCalled();
  });

  it('does NOT call emitSignal when worker reports success=false but no error', () => {
    const { result } = renderHook(
      () => ({
        scannability: useScannability(canvasRef, DEFAULT_CONFIG),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    // success=false but error is falsy – the branch `if (!success && error)` won't fire
    act(() => {
      capturedMessageHandler?.({
        data: { success: false, physicalReady: false, error: null },
      } as MessageEvent);
    });

    expect(signalCallback).not.toHaveBeenCalled();
  });

  it('emits styleId from config in the signal detail', () => {
    const customConfig = { ...DEFAULT_CONFIG, style: 'grunge' as any };

    const { result } = renderHook(
      () => ({
        scannability: useScannability(canvasRef, customConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      capturedMessageHandler?.({
        data: { success: false, physicalReady: false, error: 'NOT_FOUND' },
      } as MessageEvent);
    });

    const detail = signalCallback.mock.calls[0][0];
    expect(detail.styleId).toBe('grunge');
  });

  it('emits "default" styleId when config.style is falsy', () => {
    const customConfig = { ...DEFAULT_CONFIG, style: undefined as any };

    const { result } = renderHook(
      () => ({
        scannability: useScannability(canvasRef, customConfig),
        store: useQRStore(),
      }),
      { wrapper }
    );

    const signalCallback = vi.fn();
    act(() => {
      result.current.store.registerSignal('scannability-fail', signalCallback);
    });

    act(() => {
      capturedMessageHandler?.({
        data: { success: false, physicalReady: false, error: 'BAD_DATA' },
      } as MessageEvent);
    });

    const detail = signalCallback.mock.calls[0][0];
    expect(detail.styleId).toBe('default');
  });

  it('sets status to "fail" when worker reports failure', () => {
    const { result } = renderHook(
      () => useScannability(canvasRef, DEFAULT_CONFIG),
      { wrapper }
    );

    act(() => {
      capturedMessageHandler?.({
        data: { success: false, physicalReady: false, error: 'NOT_FOUND' },
      } as MessageEvent);
    });

    expect(result.current.status).toBe('fail');
  });

  it('sets status to "digital-pass" when worker reports success but physicalReady=false', () => {
    const { result } = renderHook(
      () => useScannability(canvasRef, DEFAULT_CONFIG),
      { wrapper }
    );

    act(() => {
      capturedMessageHandler?.({
        data: { success: true, physicalReady: false, error: null },
      } as MessageEvent);
    });

    expect(result.current.status).toBe('digital-pass');
  });

  it('sets status to "physical-pass" when worker reports success and physicalReady=true', () => {
    const { result } = renderHook(
      () => useScannability(canvasRef, DEFAULT_CONFIG),
      { wrapper }
    );

    act(() => {
      capturedMessageHandler?.({
        data: { success: true, physicalReady: true, error: null },
      } as MessageEvent);
    });

    expect(result.current.status).toBe('physical-pass');
  });

  it('removes the worker message handler on config change (effect cleanup)', () => {
    let configToUse = DEFAULT_CONFIG;

    const { rerender } = renderHook(
      () => useScannability(canvasRef, configToUse),
      { wrapper }
    );

    // Change config to trigger effect cleanup and re-run
    configToUse = { ...DEFAULT_CONFIG, value: 'https://new-value.com' };
    act(() => {
      rerender();
    });

    // The old worker's removeEventListener should have been called
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
  });
});

describe('useScannability – health score (unchanged logic, regression check)', () => {
  it('returns health score 100 with good contrast and no logo', () => {
    const config = {
      ...DEFAULT_CONFIG,
      fgColor: '#000000',
      bgColor: '#ffffff',
      eyeColor: '#000000',
      logoUrl: null,
      style: 'standard' as any,
    };
    const canvasRef = { current: null as HTMLCanvasElement | null };

    const { result } = renderHook(
      () => useScannability(canvasRef, config),
      { wrapper }
    );

    expect(result.current.health.score).toBe(100);
    expect(result.current.health.warnings).toHaveLength(0);
  });

  it('deducts points for low contrast ratio', () => {
    // #888888 on #ffffff has a contrast ratio of ~3.5:1 (between 3.0 and 4.5)
    const config = {
      ...DEFAULT_CONFIG,
      fgColor: '#888888',
      bgColor: '#ffffff',
      eyeColor: '#888888',
      logoUrl: null,
      style: 'standard' as any,
    };
    const canvasRef = { current: null as HTMLCanvasElement | null };

    const { result } = renderHook(
      () => useScannability(canvasRef, config),
      { wrapper }
    );

    // Should have a low contrast warning
    expect(result.current.health.score).toBeLessThan(100);
    const hasContrastWarning = result.current.health.warnings.some(w =>
      w.toLowerCase().includes('contrast')
    );
    expect(hasContrastWarning).toBe(true);
  });

  it('deducts 40 points for critically low contrast (below 3.0)', () => {
    // Very light gray on white – extremely low contrast
    const config = {
      ...DEFAULT_CONFIG,
      fgColor: '#dddddd',
      bgColor: '#ffffff',
      eyeColor: '#dddddd',
      logoUrl: null,
      style: 'standard' as any,
    };
    const canvasRef = { current: null as HTMLCanvasElement | null };

    const { result } = renderHook(
      () => useScannability(canvasRef, config),
      { wrapper }
    );

    expect(result.current.health.score).toBeLessThanOrEqual(60);
    const hasCriticalWarning = result.current.health.warnings.some(w =>
      w.toLowerCase().includes('critically')
    );
    expect(hasCriticalWarning).toBe(true);
  });
});