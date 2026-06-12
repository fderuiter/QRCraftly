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
import { QRProvider, useQRContext } from '@/context/QRContext';

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
      ctx: useQRContext(),
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
  it('handleOptIn(true) calls ctx.updatePreferences with telemetryOptIn: true', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(result.current.ctx.preferences.telemetryOptIn).toBe(true);
  });

  it('handleOptIn(false) calls ctx.updatePreferences with telemetryOptIn: false', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.telemetry.handleOptIn(false);
    });
    expect(result.current.ctx.preferences.telemetryOptIn).toBe(false);
  });

  it('handleOptIn(true) when status=fail sends telemetry ping immediately', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/telemetry/scannability',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    // Verify the body includes expected fields
    const callArgs = fetchSpy.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toHaveProperty('engine');
    expect(body).toHaveProperty('errorType', 'NOT_FOUND');
  });

  it('handleOptIn(true) when status=fail uses ctx.config.style', () => {
    const { result } = renderTelemetry('fail');
    act(() => {
      // Update config style via store
      result.current.ctx.updateConfig({ style: 'grunge' as any });
    });
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.styleId).toBe('grunge');
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
  it('registers scannability-fail signal handler in the context', () => {
    const { result } = renderTelemetry('idle');
    const registerSpy = vi.spyOn(result.current.ctx, 'registerSignal');
    // Force a re-render to trigger useEffect
    act(() => {
      result.current.ctx.updatePreferences({ telemetryOptIn: true });
    });
    // registerSignal is called during the useEffect for the signal registration
    // We verify the call happened (may be via the initial render effect)
    // Since the hook already mounted, just check the store has an active listener
    // by emitting and checking fetch was called
    act(() => {
      result.current.ctx.emitSignal('scannability-fail', {
        engine: 'Chromium',
        styleId: 'standard',
        errorType: 'NOT_FOUND',
      });
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    void registerSpy; // used to avoid lint warnings
  });

  it('sends ping via scannability-fail signal when telemetryOptIn is true', () => {
    const { result } = renderTelemetry('idle');
    // Opt in first
    act(() => {
      result.current.ctx.updatePreferences({ telemetryOptIn: true });
    });
    act(() => {
      result.current.ctx.emitSignal('scannability-fail', {
        engine: 'Firefox',
        styleId: 'circuit',
        errorType: 'DECODE_FAIL',
      });
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.engine).toBe('Firefox');
    expect(body.styleId).toBe('circuit');
  });

  it('does NOT send ping via scannability-fail signal when telemetryOptIn is false', () => {
    const { result } = renderTelemetry('idle');
    act(() => {
      result.current.ctx.updatePreferences({ telemetryOptIn: false });
    });
    act(() => {
      result.current.ctx.emitSignal('scannability-fail', { errorType: 'fail' });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does NOT send ping via scannability-fail signal when telemetryOptIn is null', () => {
    const { result } = renderTelemetry('idle');
    // Default is null, no opt-in/out
    act(() => {
      result.current.ctx.emitSignal('scannability-fail', { errorType: 'fail' });
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Regression: uses store directly (not indirect context destructuring)
  // -------------------------------------------------------------------------
  it('throws when used outside QRProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTelemetry('idle'))).toThrow(
      'useQRContext must be used within QRProvider'
    );
    spy.mockRestore();
  });

  it('handleOptIn styleId falls back to "default" when config.style is falsy', () => {
    const { result } = renderTelemetry('fail');
    // Override config with no style
    act(() => {
      result.current.ctx.updateConfig({ style: '' as any });
    });
    act(() => {
      result.current.telemetry.handleOptIn(true);
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.styleId).toBe('default');
  });
});