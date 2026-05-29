import { useEffect, useCallback } from 'react';
import { useQRContext } from '@/context/QRContext';
import { ScannabilityStatus } from './useScannability';

export function useTelemetry(status: ScannabilityStatus) {
  const { preferences, updatePreferences, registerSignal, config } = useQRContext();

  const sendTelemetryPing = useCallback((detail: unknown) => {
    try {
      fetch('/api/telemetry/scannability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detail),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    return registerSignal('scannability-fail', (detail) => {
      if (preferences.telemetryOptIn === true) {
        sendTelemetryPing(detail);
      }
    });
  }, [preferences.telemetryOptIn, sendTelemetryPing, registerSignal]);

  const handleOptIn = useCallback(
    (optIn: boolean) => {
      updatePreferences({ telemetryOptIn: optIn });
      if (optIn && status === 'fail') {
        sendTelemetryPing({
          engine:
            navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
              ? 'WebKit'
              : navigator.userAgent.includes('Firefox')
                ? 'Firefox'
                : 'Chromium',
          styleId: config.style || 'default',
          errorType: 'NOT_FOUND',
        });
      }
    },
    [updatePreferences, sendTelemetryPing, status, config.style],
  );

  return {
    showTelemetryPrompt: preferences.telemetryOptIn === null,
    handleOptIn,
  };
}
