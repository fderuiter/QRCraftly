import { useEffect, useCallback } from 'react';
import { useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { ScannabilityStatus } from './useScannability';
import { useCapabilities } from './useCapabilities';
import { ALLOWED_TELEMETRY_KEYS, TelemetryPayload } from '../types';

function sanitizeTelemetryPayload(payload: any): TelemetryPayload {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const sanitized: TelemetryPayload = {};
  for (const key of ALLOWED_TELEMETRY_KEYS) {
    if (key in payload) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
}

/**
 * Collection endpoint for opt-in scannability telemetry. No endpoint is deployed
 * (the edge Worker serves only `/api/redirect/*`), so this is `null` and
 * telemetry is a no-op: the opt-in choice is still recorded, but nothing is sent
 * (previously this posted to a nonexistent `/api/telemetry/scannability` route).
 * See docs/public/COMPLIANCE.md.
 */
export const TELEMETRY_ENDPOINT: string | null = null;

/**
 * Opt-in scannability telemetry: sends the allowlisted diagnostic payload to
 * `endpoint` when the user opted in, and does nothing when there is no endpoint.
 * @param status - Current scannability status.
 * @param endpoint - Collection endpoint (defaults to {@link TELEMETRY_ENDPOINT}).
 * @returns Whether to show the opt-in prompt, and the opt-in handler.
 */
export function useTelemetry(status: ScannabilityStatus, endpoint: string | null = TELEMETRY_ENDPOINT) {
  const store = useQRStore();
  const telemetryOptIn = useQRStoreSelector(state => state.preferences.telemetryOptIn);
  const { engine } = useCapabilities();

  const sendTelemetryPing = useCallback((detail: any) => {
    if (!endpoint) return;
    try {
      const sanitized = sanitizeTelemetryPayload(detail);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
        keepalive: true
      }).catch(() => {});
    } catch {}
  }, [endpoint]);

  useEffect(() => {
    return store.registerSignal('scannability-fail', (detail) => {
      if (store.getState().preferences.telemetryOptIn === true) {
        sendTelemetryPing(detail);
      }
    });
  }, [store, sendTelemetryPing]);

  const handleOptIn = useCallback((optIn: boolean) => {
    store.updatePreferences({ telemetryOptIn: optIn });
    if (optIn && status === 'fail') {
      sendTelemetryPing({
        engine,
        styleId: store.getState().config.style || 'default',
        errorType: 'NOT_FOUND'
      });
    }
  }, [store, sendTelemetryPing, status, engine]);

  return { 
    showTelemetryPrompt: telemetryOptIn === null,
    handleOptIn 
  };
}
