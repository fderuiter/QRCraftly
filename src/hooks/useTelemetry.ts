import { useCallback } from 'react';
import { useQRContext } from '@/context/QRContext';
import { ScannabilityStatus } from './useScannability';

export function useTelemetry(status: ScannabilityStatus) {
  const { preferences, updatePreferences, emitSignal, config } = useQRContext();

  const handleOptIn = useCallback((optIn: boolean) => {
    updatePreferences({ telemetryOptIn: optIn });
    if (optIn && status === 'fail') {
      emitSignal('scannability-fail', {
        engine: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'WebKit' : 
                navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium',
        styleId: config.style || 'default',
        errorType: 'NOT_FOUND'
      });
    }
  }, [updatePreferences, emitSignal, status, config.style]);

  return { 
    showTelemetryPrompt: preferences.telemetryOptIn === null,
    handleOptIn 
  };
}
