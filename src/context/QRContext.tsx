import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

interface QRContextType {
  config: QRConfig;
  updateConfig: (updates: Partial<QRConfig>) => void;
  emitSignal: (name: SignalName, detail?: any) => void;
  registerSignal: (name: SignalName, callback: SignalCallback) => () => void;
  preferences: {
    telemetryOptIn: boolean | null;
    darkMode: boolean;
  };
  updatePreferences: (updates: Partial<{telemetryOptIn: boolean | null, darkMode: boolean}>) => void;
}

const QRContext = createContext<QRContextType | undefined>(undefined);

export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const [config, setConfig] = useState<QRConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  
  const [preferences, setPreferences] = useState(() => {
    let savedOptIn: string | null = null;
    if (typeof window !== 'undefined') {
      savedOptIn = localStorage.getItem('qr-telemetry-opt-in');
    }
    return {
      telemetryOptIn: savedOptIn === 'true' ? true : savedOptIn === 'false' ? false : null,
      darkMode: false,
    };
  });

  const updateConfig = useCallback((updates: Partial<QRConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<{telemetryOptIn: boolean | null, darkMode: boolean}>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null && typeof window !== 'undefined') {
        localStorage.setItem('qr-telemetry-opt-in', String(updates.telemetryOptIn));
      }
      return next;
    });
  }, []);

  // Registry for signals
  const signalsRef = useRef<Record<SignalName, Set<SignalCallback>>>({
    'scannability-fail': new Set(),
    'render-complete': new Set(),
  });

  const registerSignal = useCallback((name: SignalName, callback: SignalCallback) => {
    const callbacks = signalsRef.current[name];
    callbacks.add(callback);
    return () => {
      callbacks.delete(callback);
    };
  }, []);

  const emitSignal = useCallback((name: SignalName, detail?: any) => {
    signalsRef.current[name].forEach(cb => cb(detail));
  }, []);

  return (
    <QRContext.Provider value={{ config, updateConfig, emitSignal, registerSignal, preferences, updatePreferences }}>
      {children}
    </QRContext.Provider>
  );
};

export const useQRContext = () => {
  const ctx = useContext(QRContext);
  if (!ctx) throw new Error("useQRContext must be used within QRProvider");
  return ctx;
};
