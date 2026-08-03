import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTelemetry } from '../src/hooks/useTelemetry';
import { QRProvider, useQRStore } from '../src/context/QRContext';
import { ALLOWED_TELEMETRY_KEYS } from '../src/types';

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

const FULL_TEST_PAYLOAD = {
  // 12 compliance-approved diagnostic keys:
  engine: 'Chromium',
  styleId: 'standard',
  errorType: 'NOT_FOUND',
  fgColor: '#000000',
  bgColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: 'M',
  isBorderEnabled: true,
  borderSize: 4,
  borderColor: '#000000',
  borderStyle: 'solid',
  templateStyle: 'none',

  // Sensitive parameters (multiple unapproved keys):
  text: 'super secret password or raw text',
  url: 'https://qrcraftly.com/user/private-data',
  password: 'myPassword123',
  ssid: 'MyWiFiNetwork',
  latitude: '37.7749',
  longitude: '-122.4194',
  customKey: 'some un-sanitized layout input',
};

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
        result.current.store.emitSignal('scannability-fail', FULL_TEST_PAYLOAD);
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does NOT trigger telemetry pings by default when telemetryOptIn is null', () => {
      const { result } = renderTelemetry('idle');

      // Do not perform opt-in or opt-out (it's null)
      // Attempt to emit a signal, telemetry ping should not trigger
      act(() => {
        result.current.store.emitSignal('scannability-fail', FULL_TEST_PAYLOAD);
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
        result.current.store.emitSignal('scannability-fail', FULL_TEST_PAYLOAD);
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
        result.current.store.emitSignal('scannability-fail', FULL_TEST_PAYLOAD);
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const callArgs = fetchSpy.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      // Verify allowlisted parameters are present with expected values
      expect(payload).toHaveProperty('engine', 'Chromium');
      expect(payload).toHaveProperty('styleId', 'standard');
      expect(payload).toHaveProperty('errorType', 'NOT_FOUND');
      expect(payload).toHaveProperty('fgColor', '#000000');
      expect(payload).toHaveProperty('bgColor', '#ffffff');
      expect(payload).toHaveProperty('eyeColor', '#000000');
      expect(payload).toHaveProperty('errorCorrectionLevel', 'M');
      expect(payload).toHaveProperty('isBorderEnabled', true);
      expect(payload).toHaveProperty('borderSize', 4);
      expect(payload).toHaveProperty('borderColor', '#000000');
      expect(payload).toHaveProperty('borderStyle', 'solid');
      expect(payload).toHaveProperty('templateStyle', 'none');

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
      expect(payloadKeys.sort()).toEqual([...ALLOWED_TELEMETRY_KEYS].sort());
    });
  });
});
