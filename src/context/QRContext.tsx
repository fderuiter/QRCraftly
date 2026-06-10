import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

interface Preferences {
  telemetryOptIn: boolean | null;
  darkMode: boolean;
}

interface QRState {
  config: QRConfig;
  moduleCount: number;
  preferences: Preferences;
}

export interface QRStore {
  getState: () => QRState;
  subscribe: (listener: () => void) => () => void;
  updateConfig: (updates: Partial<QRConfig>) => void;
  updatePreferences: (updates: Partial<Preferences>) => void;
  setModuleCount: (count: number) => void;
  emitSignal: (name: SignalName, detail?: any) => void;
  registerSignal: (name: SignalName, callback: SignalCallback) => () => void;
}

const QRContext = createContext<QRStore | undefined>(undefined);

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

export const createQRStore = (initialConfig?: Partial<QRConfig>): QRStore => {
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

  const notify = () => listeners.forEach(l => l());

  let worker: Worker | null = null;
  if (typeof window !== 'undefined') {
    try {
      worker = new Worker(new URL('../utils/signalHubWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'render-complete-processed') {
          // You could handle background processing status here
        }
      };
    } catch (err) {
      // Graceful fallback
      console.warn("Signal Hub Worker failed to initialize:", err);
    }
  }

  const store: QRStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateConfig: (updates) => {
      state = { ...state, config: { ...state.config, ...updates } };
      notify();
    },
    updatePreferences: (updates) => {
      state = { ...state, preferences: { ...state.preferences, ...updates } };
      if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null) {
        storage.setItem('qr-telemetry-opt-in', String(updates.telemetryOptIn));
      }
      notify();
    },
    setModuleCount: (count) => {
      if (state.moduleCount !== count) {
        state = { ...state, moduleCount: count };
        notify();
      }
    },
    emitSignal: (name, detail) => {
      signals[name].forEach(cb => cb(detail));
      if (name === 'render-complete') {
        if (detail && typeof detail.moduleCount === 'number') {
          store.setModuleCount(detail.moduleCount);
        }
      }

      // Offload to background worker for telemetry, passing minimal context
      if (worker) {
        if (name === 'scannability-fail') {
          worker.postMessage({
            type: 'scannability-fail',
            detail: {
              engine: detail?.engine,
              styleId: detail?.styleId || state.config.style || 'default',
              errorType: detail?.errorType,
              timestamp: Date.now(),
              telemetryOptIn: state.preferences.telemetryOptIn
            }
          });
        } else if (name === 'render-complete') {
          worker.postMessage({
            type: 'render-complete',
            detail: {
              moduleCount: detail?.moduleCount || state.moduleCount,
              timestamp: Date.now()
            }
          });
        }
      } else {
        // Fallback for when worker is not available (e.g., enterprise security policies)
        if (name === 'scannability-fail' && state.preferences.telemetryOptIn) {
          try {
            fetch('/api/telemetry/scannability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                engine: detail?.engine,
                styleId: detail?.styleId || state.config.style || 'default',
                errorType: detail?.errorType,
                timestamp: Date.now()
              }),
              keepalive: true
            }).catch(() => {});
          } catch {}
        }
      }
    },
    registerSignal: (name, callback) => {
      signals[name].add(callback);
      return () => signals[name].delete(callback);
    }
  };

  return store;
};

export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const storeRef = useRef<QRStore | undefined>(undefined);
  if (!storeRef.current) {
    storeRef.current = createQRStore(initialConfig);
  }
  
  return (
    <QRContext.Provider value={storeRef.current}>
      {children}
    </QRContext.Provider>
  );
};

export const useQRStore = () => {
  const store = useContext(QRContext);
  if (!store) throw new Error("useQRStore must be used within QRProvider");
  return store;
};

export const useQRStoreSelector = <T,>(selector: (state: QRState) => T): T => {
  const store = useQRStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()), () => selector(store.getState()));
};

export const useQRContext = () => {
  const store = useContext(QRContext);
  if (!store) throw new Error("useQRStore must be used within QRProvider");
  // provide backward compatibility for context users
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const updateConfig = React.useCallback((updates: any) => store.updateConfig(updates), [store]);
  const emitSignal = React.useCallback((name: any, detail: any) => store.emitSignal(name, detail), [store]);
  const registerSignal = React.useCallback((name: any, cb: any) => store.registerSignal(name, cb), [store]);
  const updatePreferences = React.useCallback((updates: any) => store.updatePreferences(updates), [store]);

  return {
    ...state,
    updateConfig,
    emitSignal,
    registerSignal,
    updatePreferences,
  };
};

const dummyStore: QRStore = createQRStore();

export const useOptionalQRContext = () => {
  const store = useContext(QRContext);
  const actualStore = store || dummyStore;
  const state = useSyncExternalStore(actualStore.subscribe, actualStore.getState, actualStore.getState);
  
  if (!store) return undefined;
  
  return {
    ...state,
    updateConfig: actualStore.updateConfig,
    emitSignal: actualStore.emitSignal,
    registerSignal: actualStore.registerSignal,
    updatePreferences: actualStore.updatePreferences,
  };
};
