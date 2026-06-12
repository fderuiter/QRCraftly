import { useEffect, useCallback } from 'react';
import { useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { ScannabilityStatus } from './useScannability';

export function useTelemetry(status: ScannabilityStatus) {
  const store = useQRStore();
  const telemetryOptIn = useQRStoreSelector(state => state.preferences.telemetryOptIn);

  const sendTelemetryPing = useCallback((detail: any) => {
    try {
      fetch('/api/telemetry/scannability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // eslint-disable-next-line no-restricted-syntax
        body: JSON.stringify(detail),
        keepalive: true
      }).catch(() => {});
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
        engine: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'WebKit' : 
                navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium',
        styleId: store.getState().config.style || 'default',
        errorType: 'NOT_FOUND'
      });
    }
  }, [store, sendTelemetryPing, status]);

  return { 
    showTelemetryPrompt: telemetryOptIn === null,
    handleOptIn 
  };
}
