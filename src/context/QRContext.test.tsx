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
  useQRContext,
  useOptionalQRContext,
} from './QRContext';
import { DEFAULT_CONFIG } from '@/constants';
import { QRStyle } from '@/types';

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
// Tests: QRProvider + useQRContext
// ---------------------------------------------------------------------------
describe('QRProvider and useQRContext', () => {
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

  it('useQRContext throws when used outside QRProvider', () => {
    // Suppress React error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useQRContext())).toThrow(
      'useQRContext must be used within QRProvider'
    );
    spy.mockRestore();
  });

  it('useQRContext returns defined object with updateConfig', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current.updateConfig).toBe('function');
  });

  it('initial state has DEFAULT_CONFIG values', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.config.value).toBe(DEFAULT_CONFIG.value);
    expect(result.current.config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
    expect(result.current.moduleCount).toBe(0);
  });

  it('initial state merges initialConfig with DEFAULT_CONFIG', () => {
    const { result } = renderHook(() => useQRContext(), {
      wrapper: wrapperWithConfig({ value: 'https://custom.com' }),
    });
    expect(result.current.config.value).toBe('https://custom.com');
    // Other defaults preserved
    expect(result.current.config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('reads telemetryOptIn from localStorage on construction (true)', () => {
    setLocalStorageItem('qr-telemetry-opt-in', 'true');
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.telemetryOptIn).toBe(true);
  });

  it('reads telemetryOptIn from localStorage on construction (false)', () => {
    setLocalStorageItem('qr-telemetry-opt-in', 'false');
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.telemetryOptIn).toBe(false);
  });

  it('defaults telemetryOptIn to null when localStorage is empty', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.telemetryOptIn).toBeNull();
  });

  it('defaults darkMode to false', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.darkMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: useQRContext methods
// ---------------------------------------------------------------------------
describe('useQRContext.updateConfig', () => {
  afterEach(() => {
    clearLocalStorage();
  });

  it('merges partial config updates', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updateConfig({ value: 'https://updated.com' });
    });
    expect(result.current.config.value).toBe('https://updated.com');
    // Other fields preserved
    expect(result.current.config.fgColor).toBe(DEFAULT_CONFIG.fgColor);
  });

  it('can update multiple config fields at once', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updateConfig({ fgColor: '#ff0000', bgColor: '#0000ff' });
    });
    expect(result.current.config.fgColor).toBe('#ff0000');
    expect(result.current.config.bgColor).toBe('#0000ff');
  });
});

describe('useQRContext.updatePreferences', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLocalStorage();
  });

  it('updates darkMode preference', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    expect(result.current.preferences.darkMode).toBe(true);
  });

  it('updates telemetryOptIn preference', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    expect(result.current.preferences.telemetryOptIn).toBe(true);
  });

  it('persists telemetryOptIn=true to localStorage', async () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    expect(window.localStorage.getItem('qr-telemetry-opt-in')).toBe('true');
  });

  it('persists telemetryOptIn=false to localStorage', async () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: false });
    });
    expect(window.localStorage.getItem('qr-telemetry-opt-in')).toBe('false');
  });

  it('does NOT persist to localStorage when telemetryOptIn is null', async () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    // First set it to true
    act(() => {
      result.current.updatePreferences({ telemetryOptIn: true });
    });
    // Then update preferences with only darkMode (not telemetryOptIn)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    // setItem should not have been called again for the telemetry key
    const telemetryCalls = setItemSpy.mock.calls.filter(
      ([key]) => key === 'qr-telemetry-opt-in'
    );
    expect(telemetryCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Signal system
// ---------------------------------------------------------------------------
describe('useQRContext signals', () => {
  afterEach(() => clearLocalStorage());

  it('registerSignal and emitSignal - scannability-fail', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
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
    const { result } = renderHook(() => useQRContext(), { wrapper });
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
    const { result } = renderHook(() => useQRContext(), { wrapper });
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
    const { result } = renderHook(() => useQRContext(), { wrapper });
    // QRProvider registers its own 'render-complete' handler to call setModuleCount
    act(() => {
      result.current.emitSignal('render-complete', { moduleCount: 41 });
    });
    expect(result.current.moduleCount).toBe(41);
  });

  it('emitting render-complete without moduleCount does not update store', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    const before = result.current.moduleCount;
    act(() => {
      result.current.emitSignal('render-complete', {});
    });
    expect(result.current.moduleCount).toBe(before);
  });

  it('multiple callbacks on same signal are all notified', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
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
// Tests: useQRContext state access (replacement for useQRStoreSelector)
// ---------------------------------------------------------------------------
describe('useQRContext state access', () => {
  it('returns config.value', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.config.value).toBe(DEFAULT_CONFIG.value);
  });

  it('returns preferences.darkMode as false initially', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.darkMode).toBe(false);
  });

  it('returns preferences.telemetryOptIn as null initially', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences.telemetryOptIn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: useQRContext (general verification)
// ---------------------------------------------------------------------------
describe('useQRContext', () => {
  afterEach(() => clearLocalStorage());

  it('returns config from state', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.config).toEqual(
      expect.objectContaining({ value: DEFAULT_CONFIG.value })
    );
  });

  it('returns updateConfig function', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(typeof result.current.updateConfig).toBe('function');
  });

  it('returns emitSignal function', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(typeof result.current.emitSignal).toBe('function');
  });

  it('returns registerSignal function', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(typeof result.current.registerSignal).toBe('function');
  });

  it('returns preferences with expected shape', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(result.current.preferences).toHaveProperty('telemetryOptIn');
    expect(result.current.preferences).toHaveProperty('darkMode');
  });

  it('returns updatePreferences function', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(typeof result.current.updatePreferences).toBe('function');
  });

  it('returns moduleCount as number', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    expect(typeof result.current.moduleCount).toBe('number');
  });

  it('updateConfig via useQRContext reflects in subsequent reads', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updateConfig({ style: QRStyle.MODERN });
    });
    expect(result.current.config.style).toBe(QRStyle.MODERN);
  });

  it('updatePreferences via useQRContext reflects in subsequent reads', () => {
    const { result } = renderHook(() => useQRContext(), { wrapper });
    act(() => {
      result.current.updatePreferences({ darkMode: true });
    });
    expect(result.current.preferences.darkMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: useOptionalQRContext
// ---------------------------------------------------------------------------
describe('useOptionalQRContext', () => {
  afterEach(() => clearLocalStorage());

  it('returns undefined when outside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRContext());
    expect(result.current).toBeUndefined();
  });

  it('returns context object when inside QRProvider', () => {
    const { result } = renderHook(() => useOptionalQRContext(), { wrapper });
    expect(result.current).not.toBeUndefined();
    expect(result.current).toHaveProperty('config');
    expect(result.current).toHaveProperty('updateConfig');
    expect(result.current).toHaveProperty('emitSignal');
    expect(result.current).toHaveProperty('registerSignal');
    expect(result.current).toHaveProperty('preferences');
    expect(result.current).toHaveProperty('updatePreferences');
    expect(result.current).toHaveProperty('moduleCount');
  });

  it('config from useOptionalQRContext matches DEFAULT_CONFIG', () => {
    const { result } = renderHook(() => useOptionalQRContext(), { wrapper });
    expect(result.current!.config.value).toBe(DEFAULT_CONFIG.value);
  });
});
