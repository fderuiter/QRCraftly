import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';
import { ValidationEngine } from '@/engine/ValidationEngine';

type SignalName = 'scannability-fail' | 'render-complete' | 'validation-violation';
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

const getSafeLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
    return window.localStorage;
  }
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
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
    'validation-violation': new Set(),
  };

  let worker: Worker | null = null;
  if (typeof window !== 'undefined') {
    worker = new Worker(new URL('../engine/ReasoningWorker.ts', import.meta.url), { type: 'module' });
    worker.postMessage({ type: 'init' });
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'validation-result') {
        const { violations } = payload;
        if (violations && violations.length > 0) {
          signals['validation-violation'].forEach(cb => cb(violations));
        }
      }
    };
  }

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
        store.emitSignal('validation-violation', violations);
        return; // reject insecure or invalid patch
      }
      
      // Local WASM validation on the dirty buffer (replaces remote Shadow VFS)
      if (worker && updates.value !== undefined) {
        worker.postMessage({
          type: 'sync-buffer',
          payload: { id: 'main-buffer', content: proposed.value }
        });
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
