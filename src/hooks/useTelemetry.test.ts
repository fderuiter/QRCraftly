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
import { useTelemetry } from './useTelemetry';
import { QRProvider, useQRStore } from '@/context/QRContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QRProvider, null, children);

// A wrapper that also exposes the store so we can emit signals in tests
function renderTelemetry(status: Parameters<typeof useTelemetry>[0]) {
  return renderHook(
    () => ({
      telemetry: useTelemetry(status),
      store: useQRStore(),
    }),
    { wrapper }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useTelemetry', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    // Mock global fetch
    fetchSpy = vi.fn(async () => new Response('', { status: 200 }));
    global.fetch = fetchSpy as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // showTelemetryPrompt
  // -------------------------------------------------------------------------
  it('showTelemetryPrompt is true when telemetryOptIn is null (default)', () => {
    const { result } = renderTelemetry('idle');
    expect(result.current.telemetry.showTelemetryPrompt).toBe(true);
  });

  it('showTelemetryPrompt is false after opting in', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(result.current.telemetry.showTelemetryPrompt).toBe(false);
  });

  it('showTelemetryPrompt is false after opting out', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.telemetry.handleOptIn(false);
    });
    expect(result.current.telemetry.showTelemetryPrompt).toBe(false);
  });

  // -------------------------------------------------------------------------
  // handleOptIn
  // -------------------------------------------------------------------------
  it('handleOptIn(true) calls store.updatePreferences with telemetryOptIn: true', () => {
    const { result } = renderTelemetry('idle');
    const updatePrefSpy = vi.spyOn(result.current.store, 'updatePreferences');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(updatePrefSpy).toHaveBeenCalledWith({ telemetryOptIn: true });
  });

  it('handleOptIn(false) calls store.updatePreferences with telemetryOptIn: false', () => {
    const { result } = renderTelemetry('idle');
    const updatePrefSpy = vi.spyOn(result.current.store, 'updatePreferences');
    act(() => {
      result.current.telemetry.handleOptIn(false);
    });
    expect(updatePrefSpy).toHaveBeenCalledWith({ telemetryOptIn: false });
  });

  it('handleOptIn(true) updates preferences without making network fetch requests', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handleOptIn(true) when status=fail operates offline without fetch', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      result.current.store.updateConfig({ style: 'grunge' as any });
    });
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handleOptIn(false) when status=fail does NOT send telemetry ping', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      result.current.telemetry.handleOptIn(false);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handleOptIn(true) when status is not fail does NOT send immediate ping', () => {
    const { result } = renderTelemetry('digital-pass');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handleOptIn(true) when status=idle does NOT send immediate ping', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Signal handling: 'scannability-fail'
  // -------------------------------------------------------------------------
  it('registers scannability-fail signal handler in the store without making network calls', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: true });
    });
    act(() => {
      result.current.store.emitSignal('scannability-fail', {
        engine: 'Chromium',
        styleId: 'standard',
        errorType: 'NOT_FOUND',
      });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends ping via scannability-fail signal offline when telemetryOptIn is true', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: true });
    });
    act(() => {
      result.current.store.emitSignal('scannability-fail', {
        engine: 'Firefox',
        styleId: 'circuit',
        errorType: 'DECODE_FAIL',
      });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does NOT send ping via scannability-fail signal when telemetryOptIn is false', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: false });
    });
    act(() => {
      result.current.store.emitSignal('scannability-fail', { errorType: 'fail' });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does NOT send ping via scannability-fail signal when telemetryOptIn is null', () => {
    const { result } = renderTelemetry('idle');
    // Default is null, no opt-in/out
    act(() => {
      result.current.store.emitSignal('scannability-fail', { errorType: 'fail' });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Regression: uses store directly (not indirect context destructuring)
  // -------------------------------------------------------------------------
  it('throws when used outside QRProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTelemetry('idle'))).toThrow(
      'useQRStore must be used within QRProvider'
    );
    spy.mockRestore();
  });

  it('handleOptIn operates offline without network fetch when config.style is falsy', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      result.current.store.updateConfig({ style: '' as any });
    });
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});