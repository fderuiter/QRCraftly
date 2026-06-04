import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QRProvider, useQRStore } from '@/context/QRContext';
import { useTelemetry } from './useTelemetry';
import type { ScannabilityStatus } from './useScannability';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTelemetry – showTelemetryPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is true when telemetryOptIn is null (no decision made)', () => {
    const { result } = renderHook(() => useTelemetry('idle'), { wrapper });
    expect(result.current.showTelemetryPrompt).toBe(true);
  });

  it('is false when telemetryOptIn is true', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: true });
    });
    expect(result.current.telemetry.showTelemetryPrompt).toBe(false);
  });

  it('is false when telemetryOptIn is false', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: false });
    });
    expect(result.current.telemetry.showTelemetryPrompt).toBe(false);
  });
});

describe('useTelemetry – handleOptIn', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls store.updatePreferences with telemetryOptIn=true when opting in', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.telemetry.handleOptIn(true);
    });

    expect(result.current.store.getState().preferences.telemetryOptIn).toBe(true);
  });

  it('calls store.updatePreferences with telemetryOptIn=false when opting out', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.telemetry.handleOptIn(false);
    });

    expect(result.current.store.getState().preferences.telemetryOptIn).toBe(false);
  });

  it('sends telemetry ping when optIn=true and status=fail', () => {
    const { result } = renderHook(
      () => useTelemetry('fail' as ScannabilityStatus),
      { wrapper }
    );

    act(() => {
      result.current.handleOptIn(true);
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/telemetry/scannability',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does NOT send telemetry ping when optIn=true but status is not fail', () => {
    const { result } = renderHook(
      () => useTelemetry('idle' as ScannabilityStatus),
      { wrapper }
    );

    act(() => {
      result.current.handleOptIn(true);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does NOT send telemetry ping when optIn=false regardless of status', () => {
    const { result } = renderHook(
      () => useTelemetry('fail' as ScannabilityStatus),
      { wrapper }
    );

    act(() => {
      result.current.handleOptIn(false);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ping body includes styleId from store config', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QRProvider initialConfig={{ style: 'circuit' as any }}>
        {children}
      </QRProvider>
    );
    const { result } = renderHook(
      () => useTelemetry('fail' as ScannabilityStatus),
      { wrapper: customWrapper }
    );

    act(() => {
      result.current.handleOptIn(true);
    });

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.styleId).toBe('circuit');
    expect(callBody.errorType).toBe('NOT_FOUND');
  });

  it('ping body uses "default" when config.style is undefined/falsy', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QRProvider initialConfig={{ style: undefined as any }}>
        {children}
      </QRProvider>
    );
    const { result } = renderHook(
      () => useTelemetry('fail' as ScannabilityStatus),
      { wrapper: customWrapper }
    );

    act(() => {
      result.current.handleOptIn(true);
    });

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.styleId).toBe('default');
  });
});

describe('useTelemetry – scannability-fail signal handler', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends ping via signal when telemetryOptIn=true', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    // Opt in first
    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: true });
    });

    // Emit scannability-fail signal
    act(() => {
      result.current.store.emitSignal('scannability-fail', { engine: 'Chromium', styleId: 'modern' });
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/telemetry/scannability',
      expect.objectContaining({ method: 'POST' })
    );

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.engine).toBe('Chromium');
    expect(callBody.styleId).toBe('modern');
  });

  it('does NOT send ping via signal when telemetryOptIn=false', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: false });
    });

    act(() => {
      result.current.store.emitSignal('scannability-fail', { engine: 'Chromium' });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does NOT send ping via signal when telemetryOptIn=null', () => {
    const { result } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    // telemetryOptIn stays null (default)
    act(() => {
      result.current.store.emitSignal('scannability-fail', { engine: 'Firefox' });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('registers scannability-fail signal and unregisters on unmount', () => {
    const { result, unmount } = renderHook(
      () => ({
        telemetry: useTelemetry('idle'),
        store: useQRStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.store.updatePreferences({ telemetryOptIn: true });
    });

    unmount();

    // After unmount, firing the signal should not send a ping
    // (signal callback unregistered)
    act(() => {
      result.current.store.emitSignal('scannability-fail', { engine: 'Chromium' });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});