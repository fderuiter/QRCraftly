import { useEffect, useCallback } from 'react';
import { useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { ScannabilityStatus } from './useScannability';

export function useTelemetry(status: ScannabilityStatus) {
  const store = useQRStore();
  const telemetryOptIn = useQRStoreSelector(s => s.preferences.telemetryOptIn);

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
      if (telemetryOptIn === true) {
        sendTelemetryPing(detail);
      }
    });
  }, [telemetryOptIn, sendTelemetryPing, store]);

  const handleOptIn = useCallback((optIn: boolean) => {
    store.updatePreferences({ telemetryOptIn: optIn });
    if (optIn && status === 'fail') {
      const currentConfig = store.getState().config;
      sendTelemetryPing({
        engine: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'WebKit' : 
                navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium',
        styleId: currentConfig.style || 'default',
        errorType: 'NOT_FOUND'
      });
    }
  }, [store, sendTelemetryPing, status]);

  return { 
    showTelemetryPrompt: telemetryOptIn === null,
    handleOptIn 
  };
}
