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
 *
 * @param status
 */
export function useTelemetry(status: ScannabilityStatus) {
  const store = useQRStore();
  const telemetryOptIn = useQRStoreSelector(state => state.preferences.telemetryOptIn);
  const { engine } = useCapabilities();

  const sendTelemetryPing = useCallback((detail: any) => {
    try {
      const sanitized = sanitizeTelemetryPayload(detail);
      // Zero-transit policy: telemetry payload is sanitized locally in memory without triggering network requests
      void sanitized;
    } catch {}
  }, []);

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
