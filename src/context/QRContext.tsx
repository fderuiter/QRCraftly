import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

interface QRContextType {
  moduleCount: number;
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

export type QRState = {
  config: QRConfig;
  moduleCount: number;
  preferences: { telemetryOptIn: boolean | null; darkMode: boolean };
};

export interface QRStore {
  getState: () => QRState;
  subscribe: (listener: () => void) => () => void;
  updateConfig: (updates: Partial<QRConfig>) => void;
  setModuleCount: (count: number) => void;
  updatePreferences: (updates: Partial<{telemetryOptIn: boolean | null, darkMode: boolean}>) => void;
  emitSignal: (name: SignalName, detail?: any) => void;
  registerSignal: (name: SignalName, callback: SignalCallback) => () => void;
}

const QRContext = createContext<QRContextType | undefined>(undefined);
const QRStoreContext = createContext<QRStore | undefined>(undefined);

import { safeStorage } from '@/infrastructure/storage';

function createQRStore(initialConfig?: Partial<QRConfig>): QRStore {
  const savedOptIn = safeStorage.getItem('qr-telemetry-opt-in');
  
  let state: QRState = {
    config: { ...DEFAULT_CONFIG, ...initialConfig },
    moduleCount: 0,
    preferences: {
      telemetryOptIn: savedOptIn === 'true' ? true : savedOptIn === 'false' ? false : null,
      darkMode: false,
    }
  };

  const listeners = new Set<() => void>();
  const signals: Record<SignalName, Set<SignalCallback>> = {
    'scannability-fail': new Set(),
    'render-complete': new Set(),
  };

  const store: QRStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    updateConfig: (updates) => {
      state = { ...state, config: { ...state.config, ...updates } };
      listeners.forEach(l => l());
    },
    updatePreferences: (updates) => {
      state = { ...state, preferences: { ...state.preferences, ...updates } };
      if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null) {
        safeStorage.setItem('qr-telemetry-opt-in', String(updates.telemetryOptIn));
      }
      listeners.forEach(l => l());
    },
    setModuleCount: (count) => {
      if (state.moduleCount !== count) {
        state = { ...state, moduleCount: count };
        listeners.forEach(l => l());
      }
    },
    emitSignal: (name, detail) => {
      signals[name].forEach(cb => cb(detail));
    },
    registerSignal: (name, callback) => {
      signals[name].add(callback);
      return () => {
        signals[name].delete(callback);
      };
    }
  };

  // Listen for render-complete to update moduleCount internally
  store.registerSignal('render-complete', (detail) => {
    if (detail && detail.moduleCount !== undefined) {
      store.setModuleCount(detail.moduleCount);
    }
  });

  return store;
}

export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const [store] = useState(() => createQRStore(initialConfig));

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const contextValue: QRContextType = {
    config: state.config,
    updateConfig: store.updateConfig,
    emitSignal: store.emitSignal,
    registerSignal: store.registerSignal,
    preferences: state.preferences,
    updatePreferences: store.updatePreferences,
    moduleCount: state.moduleCount
  };

  return (
    <QRStoreContext.Provider value={store}>
      <QRContext.Provider value={contextValue}>
        {children}
      </QRContext.Provider>
    </QRStoreContext.Provider>
  );
};

export const useQRContext = () => {
  const ctx = useContext(QRContext);
  if (!ctx) throw new Error("useQRContext must be used within QRProvider");
  return ctx;
};

export const useOptionalQRContext = () => {
  return useContext(QRContext);
};

export function useQRStore() {
  const store = useContext(QRStoreContext);
  if (!store) {
    throw new Error('useQRStore must be used within QRProvider');
  }
  return store;
}

export function useQRStoreSelector<T>(selector: (state: QRState) => T): T {
  const store = useQRStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
