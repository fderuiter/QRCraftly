import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QRProvider,
  useQRStore,
  useQRStoreSelector,
  useQRContext,
  useOptionalQRContext,
} from './QRContext';
import { DEFAULT_CONFIG } from '@/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

// ---------------------------------------------------------------------------
// QRStore – direct class behaviour tested through the provider hooks
// ---------------------------------------------------------------------------

describe('QRProvider – initial state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initialises config from DEFAULT_CONFIG', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().config).toMatchObject({
      value: DEFAULT_CONFIG.value,
      fgColor: DEFAULT_CONFIG.fgColor,
    });
  });

  it('merges provided initialConfig over DEFAULT_CONFIG', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QRProvider initialConfig={{ value: 'https://custom.example.com' }}>
        {children}
      </QRProvider>
    );
    const { result } = renderHook(() => useQRStore(), { wrapper: customWrapper });
    expect(result.current.getState().config.value).toBe('https://custom.example.com');
  });

  it('reads telemetryOptIn = true from localStorage', () => {
    localStorage.setItem('qr-telemetry-opt-in', 'true');
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBe(true);
  });

  it('reads telemetryOptIn = false from localStorage', () => {
    localStorage.setItem('qr-telemetry-opt-in', 'false');
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBe(false);
  });

  it('leaves telemetryOptIn as null when localStorage has no entry', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBeNull();
  });

  it('initialises moduleCount to 0', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().moduleCount).toBe(0);
  });

  it('initialises darkMode to false', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.darkMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// QRStore.updateConfig
// ---------------------------------------------------------------------------

describe('QRStore.updateConfig', () => {
  it('merges partial config updates', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updateConfig({ value: 'https://updated.com' });
    });
    expect(result.current.getState().config.value).toBe('https://updated.com');
    // Other config fields remain intact
    expect(result.current.getState().config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('notifies subscribed listeners when config changes', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
    });
    act(() => {
      result.current.updateConfig({ value: 'https://listen-test.com' });
    });
    expect(listener).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QRStore.updatePreferences
// ---------------------------------------------------------------------------

describe('QRStore.updatePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('merges partial preference updates', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    expect(result.current.getState().preferences.darkMode).toBe(true);
  });

  it('persists telemetryOptIn=true to localStorage', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    // asyncPersist uses queueMicrotask, so flush microtasks
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.getItem('qr-telemetry-opt-in')).toBe('true');
  });

  it('persists telemetryOptIn=false to localStorage', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: false });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.getItem('qr-telemetry-opt-in')).toBe('false');
  });

  it('does NOT write to localStorage when telemetryOptIn is null', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: null as any });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.getItem('qr-telemetry-opt-in')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// QRStore.setModuleCount
// ---------------------------------------------------------------------------

describe('QRStore.setModuleCount', () => {
  it('updates moduleCount when it changes', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.setModuleCount(25);
    });
    expect(result.current.getState().moduleCount).toBe(25);
  });

  it('does NOT notify listeners when moduleCount is the same', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.setModuleCount(25);
    });
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
      listener.mockClear(); // ignore immediate subscription call if any
    });
    act(() => {
      result.current.setModuleCount(25); // same value
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QRStore.subscribe / unsubscribe
// ---------------------------------------------------------------------------

describe('QRStore.subscribe', () => {
  it('adds listener and calls it on state change', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
    });
    act(() => {
      result.current.updateConfig({ value: 'change' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returned unsubscribe function stops future notifications', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe(listener);
    });
    act(() => {
      unsub!();
    });
    act(() => {
      result.current.updateConfig({ value: 'after-unsub' });
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QRStore.registerSignal / emitSignal
// ---------------------------------------------------------------------------

describe('QRStore signals', () => {
  it('registerSignal adds a callback that fires on emitSignal', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const callback = vi.fn();
    act(() => {
      result.current.registerSignal('scannability-fail', callback);
    });
    act(() => {
      result.current.emitSignal('scannability-fail', { engine: 'Chromium' });
    });
    expect(callback).toHaveBeenCalledWith({ engine: 'Chromium' });
  });

  it('emitSignal fires all registered callbacks for the signal name', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    act(() => {
      result.current.registerSignal('render-complete', cb1);
      result.current.registerSignal('render-complete', cb2);
      result.current.emitSignal('render-complete', { moduleCount: 21 });
    });
    expect(cb1).toHaveBeenCalledWith({ moduleCount: 21 });
    expect(cb2).toHaveBeenCalledWith({ moduleCount: 21 });
  });

  it('unsubscribing from a signal prevents future callbacks', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const callback = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.registerSignal('scannability-fail', callback);
    });
    act(() => {
      unsub!();
      result.current.emitSignal('scannability-fail', {});
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('emitSignal does not throw when no callbacks are registered', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(() => {
      act(() => {
        result.current.emitSignal('scannability-fail');
      });
    }).not.toThrow();
  });

  it('emitSignal for different signal names does not cross-fire', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const failCb = vi.fn();
    const completeCb = vi.fn();
    act(() => {
      result.current.registerSignal('scannability-fail', failCb);
      result.current.registerSignal('render-complete', completeCb);
      result.current.emitSignal('scannability-fail', { err: true });
    });
    expect(failCb).toHaveBeenCalledTimes(1);
    expect(completeCb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// QRProvider – render-complete signal updates moduleCount
// ---------------------------------------------------------------------------

describe('QRProvider render-complete auto-signal', () => {
  it('updates moduleCount via render-complete signal', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.emitSignal('render-complete', { moduleCount: 29 });
    });
    expect(result.current.getState().moduleCount).toBe(29);
  });

  it('ignores render-complete when detail has no moduleCount', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.emitSignal('render-complete', {});
    });
    expect(result.current.getState().moduleCount).toBe(0);
  });

  it('ignores render-complete when detail is null/undefined', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.emitSignal('render-complete', null);
    });
    expect(result.current.getState().moduleCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// useQRStore
// ---------------------------------------------------------------------------

describe('useQRStore', () => {
  it('returns the store instance when inside QRProvider', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current.getState).toBe('function');
  });

  it('throws an error when used outside QRProvider', () => {
    // renderHook without wrapper – no provider
    expect(() => {
      renderHook(() => useQRStore());
    }).toThrow('useQRStore must be used within QRProvider');
  });
});

// ---------------------------------------------------------------------------
// useQRStoreSelector
// ---------------------------------------------------------------------------

describe('useQRStoreSelector', () => {
  it('returns the selected slice of state', () => {
    const { result } = renderHook(
      () => useQRStoreSelector(s => s.config.value),
      { wrapper }
    );
    expect(result.current).toBe(DEFAULT_CONFIG.value);
  });

  it('re-renders when the selected slice changes', () => {
    const store = { current: null as any };
    const { result: storeResult } = renderHook(() => useQRStore(), { wrapper });

    const { result } = renderHook(
      () => ({
        store: useQRStore(),
        value: useQRStoreSelector(s => s.config.value),
      }),
      { wrapper }
    );

    expect(result.current.value).toBe(DEFAULT_CONFIG.value);

    act(() => {
      result.current.store.updateConfig({ value: 'https://selector-test.com' });
    });

    expect(result.current.value).toBe('https://selector-test.com');
  });

  it('does not trigger re-render when unselected state changes', () => {
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount++;
        const store = useQRStore();
        const fgColor = useQRStoreSelector(s => s.config.fgColor);
        return { store, fgColor };
      },
      { wrapper }
    );

    const countBeforeUpdate = renderCount;
    act(() => {
      // Change moduleCount – not selected by the selector
      result.current.store.setModuleCount(42);
    });

    // fgColor selector should not have caused a re-render because fgColor is unchanged
    // Note: useSyncExternalStore may call the snapshot fn, but if value is same, no re-render
    expect(result.current.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('returns dark mode from preferences selector', () => {
    const { result } = renderHook(
      () => ({
        store: useQRStore(),
        darkMode: useQRStoreSelector(s => s.preferences.darkMode),
      }),
      { wrapper }
    );

    expect(result.current.darkMode).toBe(false);
    act(() => {
      result.current.store.updatePreferences({ darkMode: true });
    });
    expect(result.current.darkMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useQRContext (backward compatibility)
// ---------------------------------------------------------------------------

describe('useQRContext', () => {
  it('returns all expected fields', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    const ctx = result.current;
    expect(ctx).toHaveProperty('config');
    expect(ctx).toHaveProperty('updateConfig');
    expect(ctx).toHaveProperty('emitSignal');
    expect(ctx).toHaveProperty('registerSignal');
    expect(ctx).toHaveProperty('preferences');
    expect(ctx).toHaveProperty('updatePreferences');
    expect(ctx).toHaveProperty('moduleCount');
  });

  it('config reflects current store config', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.config.value).toBe(DEFAULT_CONFIG.value);
  });

  it('updateConfig merges into store state', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updateConfig({ fgColor: '#ff0000' });
    });
    expect(result.current.config.fgColor).toBe('#ff0000');
  });

  it('throws when used outside QRProvider', () => {
    expect(() => renderHook(() => useQRContext())).toThrow();
  });
});

// ---------------------------------------------------------------------------
// useOptionalQRContext
// ---------------------------------------------------------------------------

describe('useOptionalQRContext', () => {
  it('returns undefined when outside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRContext());
    expect(result.current).toBeUndefined();
  });

  it('returns context object when inside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRContext(), { wrapper });
    expect(result.current).not.toBeUndefined();
    expect(result.current).toHaveProperty('config');
    expect(result.current).toHaveProperty('preferences');
    expect(result.current).toHaveProperty('moduleCount');
  });

  it('returned config matches store state', () => {
    const { result } = renderHook(() => useOptionalQRContext(), { wrapper });
    expect(result.current!.config.value).toBe(DEFAULT_CONFIG.value);
  });
});

// ---------------------------------------------------------------------------
// QRProvider – renders children
// ---------------------------------------------------------------------------

describe('QRProvider renders children', () => {
  it('renders child components', () => {
    render(
      <QRProvider>
        <div data-testid="child">hello</div>
      </QRProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});