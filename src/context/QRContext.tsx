import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';

import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';
import { ValidationEngine } from '@/engine/ValidationEngine';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

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

const QRStoreContext = createContext<QRStore | undefined>(undefined);

const fallbackMemoryStore = new Map<string, string>();

const getSafeLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
    try {
      window.localStorage.setItem('__test__', '1');
      window.localStorage.removeItem('__test__');
      return {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => window.localStorage.setItem(key, value)
      };
    } catch (e) {
      // Use fallback
    }
  }
  return {
    getItem: (key: string) => fallbackMemoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => { fallbackMemoryStore.set(key, value); }
  };
};

function createQRStore(initialConfig?: Partial<QRConfig>): QRStore {
  const storage = getSafeLocalStorage();
  const savedOptIn = storage.getItem('qr-telemetry-opt-in');
  
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
      const proposed = { ...state.config, ...updates };
      const violations = ValidationEngine.validateConfig(proposed);
      if (violations.length > 0) {
        return; // reject insecure or invalid patch
      }
      state = { ...state, config: proposed };
      listeners.forEach(l => l());
    },
    updatePreferences: (updates) => {
      state = { ...state, preferences: { ...state.preferences, ...updates } };
      if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null) {
        getSafeLocalStorage().setItem('qr-telemetry-opt-in', String(updates.telemetryOptIn));
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

  return (
    <QRStoreContext.Provider value={store}>
      {children}
    </QRStoreContext.Provider>
  );
};

export function useOptionalQRStoreSelector<T>(selector: (state: QRState) => T): T | undefined {
  const store = useContext(QRStoreContext);
  
  const subscribe = store ? store.subscribe : () => () => {};
  const getSnapshot = () => store ? selector(store.getState()) : undefined;
  
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

export function useQRStoreSelector<T>(selector: (state: QRState) => T): T {
  const store = useQRStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

export function useQRStore() {
  const store = useContext(QRStoreContext);
  if (!store) {
    throw new Error('useQRStore must be used within QRProvider');
  }
  return store;
}
