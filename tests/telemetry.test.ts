import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTelemetry } from '../src/hooks/useTelemetry';
import { QRProvider, useQRStore } from '../src/context/QRContext';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QRProvider, null, children);

function renderTelemetry(status: Parameters<typeof useTelemetry>[0]) {
  return renderHook(
    () => ({
      telemetry: useTelemetry(status),
      store: useQRStore(),
    }),
    { wrapper }
  );
}

describe('Telemetry Consent & Compliance Integration Tests', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchSpy = vi.fn(async () => new Response('', { status: 200 }));
    global.fetch = fetchSpy as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  // 1. Consent Preference Isolation
  describe('Consent Preference Isolation', () => {
    it('does NOT trigger telemetry pings when user has opted out (telemetryOptIn is false)', () => {
      const { result } = renderTelemetry('idle');

      // Explicitly set the opt-out preference
      act(() => {
        result.current.telemetry.handleOptIn(false);
      });

      expect(fetchSpy).not.toHaveBeenCalled();

      // Attempt to emit a signal, telemetry ping should still not trigger
      act(() => {
        result.current.store.emitSignal('scannability-fail', {
          engine: 'Chromium',
          styleId: 'standard',
          errorType: 'NOT_FOUND',
        });
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does NOT trigger telemetry pings by default when telemetryOptIn is null', () => {
      const { result } = renderTelemetry('idle');

      // Do not perform opt-in or opt-out (it's null)
      // Attempt to emit a signal, telemetry ping should not trigger
      act(() => {
        result.current.store.emitSignal('scannability-fail', {
          engine: 'Chromium',
          styleId: 'standard',
          errorType: 'NOT_FOUND',
        });
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('triggers telemetry pings only when user has explicitly opted in', () => {
      const { result } = renderTelemetry('idle');

      // Explicitly set opt-in
      act(() => {
        result.current.telemetry.handleOptIn(true);
      });

      // Emit a signal, telemetry ping should trigger
      act(() => {
        result.current.store.emitSignal('scannability-fail', {
          engine: 'Chromium',
          styleId: 'standard',
          errorType: 'NOT_FOUND',
        });
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // 2. Payload Parameter Sanitization / Auditing
  describe('Payload Parameter Sanitization', () => {
    it('only permits allowlisted tracking parameters and strips any sensitive user parameter keys', () => {
      const { result } = renderTelemetry('idle');

      // Explicitly set opt-in
      act(() => {
        result.current.telemetry.handleOptIn(true);
      });

      // Emit a signal containing allowlisted parameters along with multiple sensitive user fields
      act(() => {
        result.current.store.emitSignal('scannability-fail', {
          engine: 'Chromium',
          styleId: 'standard',
          errorType: 'NOT_FOUND',
          // Sensitive parameters:
          text: 'super secret password or raw text',
          url: 'https://qrcraftly.com/user/private-data',
          password: 'myPassword123',
          ssid: 'MyWiFiNetwork',
          latitude: '37.7749',
          longitude: '-122.4194',
          customKey: 'some un-sanitized layout input',
        });
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const callArgs = fetchSpy.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      // Verify allowlisted parameters are present
      expect(payload).toHaveProperty('engine', 'Chromium');
      expect(payload).toHaveProperty('styleId', 'standard');
      expect(payload).toHaveProperty('errorType', 'NOT_FOUND');

      // Verify all non-allowlisted / sensitive keys are stripped out
      expect(payload).not.toHaveProperty('text');
      expect(payload).not.toHaveProperty('url');
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('ssid');
      expect(payload).not.toHaveProperty('latitude');
      expect(payload).not.toHaveProperty('longitude');
      expect(payload).not.toHaveProperty('customKey');

      // Confirm only allowlisted fields exist in the payload
      const payloadKeys = Object.keys(payload);
      expect(payloadKeys.sort()).toEqual(['engine', 'styleId', 'errorType'].sort());
    });
  });
});
