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
 * Whether telemetry is sent. No collection endpoint is deployed (the edge Worker
 * serves only `/api/redirect/*`), so this is `false` and telemetry is a no-op:
 * the opt-in choice is still recorded, but nothing is sent (previously this
 * posted to the nonexistent route). See docs/public/COMPLIANCE.md.
 */
export const TELEMETRY_ENABLED = false;

/**
 * Opt-in scannability telemetry: sends the allowlisted diagnostic payload to
 * the same-origin collection path when the user opted in and sending is
 * enabled, and does nothing otherwise.
 * @param status - Current scannability status.
 * @param enabled - Whether sending is enabled (defaults to {@link TELEMETRY_ENABLED}).
 * @returns Whether to show the opt-in prompt, and the opt-in handler.
 */
export function useTelemetry(status: ScannabilityStatus, enabled: boolean = TELEMETRY_ENABLED) {
  const store = useQRStore();
  const telemetryOptIn = useQRStoreSelector(state => state.preferences.telemetryOptIn);
  const { engine } = useCapabilities();

  const sendTelemetryPing = useCallback((detail: any) => {
    if (!enabled) return;
    try {
      const sanitized = sanitizeTelemetryPayload(detail);
      // Literal same-origin path so the bundle compliance audit can authorize this call site.
      fetch('/api/telemetry/scannability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
        keepalive: true
      }).catch(() => {});
    } catch {}
  }, [enabled]);

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
