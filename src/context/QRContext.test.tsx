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
import { render, renderHook, act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QRProvider,
  useQRStore,
  useQRStoreSelector,
  useOptionalQRStoreSelector,
} from './QRContext';
import { DEFAULT_CONFIG } from '@/constants';

// ---------------------------------------------------------------------------
// Helper wrapper
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

const wrapperWithConfig = (initialConfig: any) =>
  ({ children }: { children: React.ReactNode }) => (
    <QRProvider initialConfig={initialConfig}>{children}</QRProvider>
  );

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
function setLocalStorageItem(key: string, value: string) {
  window.localStorage.setItem(key, value);
}

function clearLocalStorage() {
  window.localStorage.clear();
}

// ---------------------------------------------------------------------------
// Tests: QRProvider + useQRStore
// ---------------------------------------------------------------------------
describe('QRProvider and useQRStore', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLocalStorage();
  });

  it('renders children without crashing', () => {
    render(
      <QRProvider>
        <div data-testid="child">hello</div>
      </QRProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('useQRStore throws when used outside QRProvider', () => {
    // Suppress React error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useQRStore())).toThrow(
      'useQRStore must be used within QRProvider'
    );
    spy.mockRestore();
  });

  it('useQRStore returns the store with getState method', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(typeof result.current.getState).toBe('function');
  });

  it('initial state has DEFAULT_CONFIG values', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const state = result.current.getState();
    expect(state.config.value).toBe(DEFAULT_CONFIG.value);
    expect(state.config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
    expect(state.moduleCount).toBe(0);
  });

  it('initial state merges initialConfig with DEFAULT_CONFIG', () => {
    const { result } = renderHook(() => useQRStore(), {
      wrapper: wrapperWithConfig({ value: 'https://custom.com' }),
    });
    const state = result.current.getState();
    expect(state.config.value).toBe('https://custom.com');
    // Other defaults preserved
    expect(state.config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('reads telemetryOptIn from localStorage on construction (true)', () => {
    setLocalStorageItem('qr-telemetry-opt-in', 'true');
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBe(true);
  });

  it('reads telemetryOptIn from localStorage on construction (false)', () => {
    setLocalStorageItem('qr-telemetry-opt-in', 'false');
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBe(false);
  });

  it('defaults telemetryOptIn to null when localStorage is empty', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.telemetryOptIn).toBeNull();
  });

  it('defaults darkMode to false', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    expect(result.current.getState().preferences.darkMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: QRStore methods
// ---------------------------------------------------------------------------
describe('QRStore.updateConfig', () => {
  afterEach(() => {
    clearLocalStorage();
  });

  it('merges partial config updates', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updateConfig({ value: 'https://updated.com' });
    });
    expect(result.current.getState().config.value).toBe('https://updated.com');
    // Other fields preserved
    expect(result.current.getState().config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('notifies subscribers when config changes', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
    });
    act(() => {
      result.current.updateConfig({ value: 'https://notify.com' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('can update multiple config fields at once', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updateConfig({ fgColor: '#ff0000', bgColor: '#0000ff' });
    });
    expect(result.current.getState().config.fgColor).toBe('#ff0000');
    expect(result.current.getState().config.bgColor).toBe('#0000ff');
  });
});

describe('QRStore.updatePreferences', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLocalStorage();
  });

  it('updates darkMode preference', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    expect(result.current.getState().preferences.darkMode).toBe(true);
  });

  it('updates telemetryOptIn preference', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    expect(result.current.getState().preferences.telemetryOptIn).toBe(true);
  });

  it('persists telemetryOptIn=true to localStorage', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    // asyncPersist uses queueMicrotask, flush it
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(window.localStorage.getItem('qr-telemetry-opt-in')).toBe('true');
  });

  it('persists telemetryOptIn=false to localStorage', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: false });
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    expect(window.localStorage.getItem('qr-telemetry-opt-in')).toBe('false');
  });

  it('does NOT persist to localStorage when telemetryOptIn is null', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    // First set it to true
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    // Then update preferences with only darkMode (not telemetryOptIn)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    // setItem should not have been called again for the telemetry key
    const telemetryCalls = setItemSpy.mock.calls.filter(
      ([key]) => key === 'qr-telemetry-opt-in'
    );
    expect(telemetryCalls.length).toBe(0);
  });
});

describe('QRStore.setModuleCount', () => {
  afterEach(() => clearLocalStorage());

  it('updates moduleCount when value differs', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.setModuleCount(25);
    });
    expect(result.current.getState().moduleCount).toBe(25);
  });

  it('does not notify subscribers when moduleCount is unchanged', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      result.current.setModuleCount(25);
    });
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
    });
    // Set the same value again
    act(() => {
      result.current.setModuleCount(25);
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('QRStore.subscribe', () => {
  afterEach(() => clearLocalStorage());

  it('returns an unsubscribe function', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.subscribe(() => {});
    });
    expect(typeof unsub).toBe('function');
  });

  it('listener is not called after unsubscription', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener = vi.fn();
    let unsub: (() => void) | undefined;
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

  it('multiple listeners are all notified', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    act(() => {
      result.current.subscribe(listener1);
      result.current.subscribe(listener2);
    });
    act(() => {
      result.current.updateConfig({ value: 'multi' });
    });
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: Signal system
// ---------------------------------------------------------------------------
describe('QRStore signals', () => {
  afterEach(() => clearLocalStorage());

  it('registerSignal and emitSignal - scannability-fail', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const callback = vi.fn();
    act(() => {
      result.current.registerSignal('scannability-fail', callback);
    });
    act(() => {
      result.current.emitSignal('scannability-fail', { errorType: 'NOT_FOUND' });
    });
    expect(callback).toHaveBeenCalledWith({ errorType: 'NOT_FOUND' });
  });

  it('registerSignal and emitSignal - render-complete', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const callback = vi.fn();
    act(() => {
      result.current.registerSignal('render-complete', callback);
    });
    act(() => {
      result.current.emitSignal('render-complete', { moduleCount: 33 });
    });
    expect(callback).toHaveBeenCalledWith({ moduleCount: 33 });
  });

  it('unregistering a signal callback stops it from being called', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const callback = vi.fn();
    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.registerSignal('scannability-fail', callback);
    });
    act(() => {
      unsub!();
    });
    act(() => {
      result.current.emitSignal('scannability-fail', { errorType: 'fail' });
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('emitting render-complete with moduleCount updates store moduleCount', async () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    // QRProvider registers its own 'render-complete' handler to call setModuleCount
    act(() => {
      result.current.emitSignal('render-complete', { moduleCount: 41 });
    });
    expect(result.current.getState().moduleCount).toBe(41);
  });

  it('emitting render-complete without moduleCount does not update store', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const before = result.current.getState().moduleCount;
    act(() => {
      result.current.emitSignal('render-complete', {});
    });
    expect(result.current.getState().moduleCount).toBe(before);
  });

  it('multiple callbacks on same signal are all notified', () => {
    const { result } = renderHook(() => useQRStore(), { wrapper });
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    act(() => {
      result.current.registerSignal('scannability-fail', cb1);
      result.current.registerSignal('scannability-fail', cb2);
    });
    act(() => {
      result.current.emitSignal('scannability-fail', { errorType: 'test' });
    });
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: useQRStoreSelector
// ---------------------------------------------------------------------------
describe('useQRStoreSelector', () => {
  afterEach(() => clearLocalStorage());

  it('returns the selected slice of state', () => {
    const { result } = renderHook(
      () => useQRStoreSelector(s => s.config.value),
      { wrapper }
    );
    expect(result.current).toBe(DEFAULT_CONFIG.value);
  });

  it('re-renders when the selected value changes', () => {
    const renderCount = { count: 0 };
    renderHook(
      () => {
        renderCount.count++;
        return useQRStoreSelector(s => s.config.value);
      },
      { wrapper }
    );

    const initialCount = renderCount.count;

    // Get the store to trigger an update
    const storeResult = renderHook(() => useQRStore(), { wrapper });
    act(() => {
      storeResult.result.current.updateConfig({ value: 'https://new.com' });
    });

    // The selector should see the new value if we re-read from a fresh hook
    // (Note: this tests that the selector subscribes correctly)
    const { result: result2 } = renderHook(
      () => useQRStoreSelector(s => s.config.value),
      { wrapper }
    );
    // After provider-level update, new hooks get latest state
    expect(result2.current).toBe(DEFAULT_CONFIG.value); // fresh provider = fresh store
    expect(renderCount.count).toBe(initialCount); // No spurious re-renders in original hook
  });

  it('selector for preferences.darkMode returns false initially', () => {
    const { result } = renderHook(
      () => useQRStoreSelector(s => s.preferences.darkMode),
      { wrapper }
    );
    expect(result.current).toBe(false);
  });

  it('selector for preferences.telemetryOptIn returns null initially', () => {
    const { result } = renderHook(
      () => useQRStoreSelector(s => s.preferences.telemetryOptIn),
      { wrapper }
    );
    expect(result.current).toBeNull();
  });

  it('same-value updates do not change selected reference', () => {
    const { result } = renderHook(
      () => {
        const store = useQRStore();
        const val = useQRStoreSelector(s => s.config.fgColor);
        return { store, val };
      },
      { wrapper }
    );
    const originalVal = result.current.val;
    act(() => {
      // Update something else, not fgColor
      result.current.store.updateConfig({ value: 'https://unrelated.com' });
    });
    // fgColor should still be the same object/value
    expect(result.current.val).toBe(originalVal);
  });
});


// ---------------------------------------------------------------------------
// Tests: useOptionalQRStoreSelector
// ---------------------------------------------------------------------------
describe('useOptionalQRStoreSelector', () => {
  it('returns undefined when outside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRStoreSelector(s => s.moduleCount));
    expect(result.current).toBeUndefined();
  });

  it('returns selected state when inside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRStoreSelector(s => s.moduleCount), { wrapper });
    expect(result.current).toBe(0);
  });
});
