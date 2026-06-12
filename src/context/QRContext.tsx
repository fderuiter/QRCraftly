import React, { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

interface QRStoreState {
  config: QRConfig;
  moduleCount: number;
  preferences: {
    telemetryOptIn: boolean | null;
    darkMode: boolean;
  };
}

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

class QRStoreImpl {
  private state: QRStoreState;
  private listeners: Set<() => void>;
  private signalCallbacks: Record<SignalName, Set<SignalCallback>>;

  constructor(initialConfig?: Partial<QRConfig>) {
    const storage = getSafeLocalStorage();
    const savedOptIn = storage.getItem('qr-telemetry-opt-in');
    this.state = {
      config: { ...DEFAULT_CONFIG, ...initialConfig },
      moduleCount: 0,
      preferences: {
        telemetryOptIn: savedOptIn === 'true' ? true : savedOptIn === 'false' ? false : null,
        darkMode: false,
      },
    };
    this.listeners = new Set();
    this.signalCallbacks = {
      'scannability-fail': new Set(),
      'render-complete': new Set(),
    };
    // Internal handler: render-complete updates moduleCount
    this.signalCallbacks['render-complete'].add((detail) => {
      if (detail && detail.moduleCount) {
        this.setModuleCount(detail.moduleCount);
      }
    });
  }

  getState(): QRStoreState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  updateConfig(updates: Partial<QRConfig>): void {
    this.state = { ...this.state, config: { ...this.state.config, ...updates } };
    this.notify();
  }

  updatePreferences(updates: Partial<{ telemetryOptIn: boolean | null; darkMode: boolean }>): void {
    const next = { ...this.state.preferences, ...updates };
    this.state = { ...this.state, preferences: next };
    this.notify();
    if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null) {
      const optIn = updates.telemetryOptIn;
      queueMicrotask(() => {
        const storage = getSafeLocalStorage();
        storage.setItem('qr-telemetry-opt-in', String(optIn));
      });
    }
  }

  setModuleCount(count: number): void {
    if (count === this.state.moduleCount) return;
    this.state = { ...this.state, moduleCount: count };
    this.notify();
  }

  registerSignal(name: SignalName, callback: SignalCallback): () => void {
    this.signalCallbacks[name].add(callback);
    return () => {
      this.signalCallbacks[name].delete(callback);
    };
  }

  emitSignal(name: SignalName, detail?: any): void {
    this.signalCallbacks[name].forEach(cb => cb(detail));
  }
}

const QRStoreContext = createContext<QRStoreImpl | undefined>(undefined);

export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const storeRef = useRef<QRStoreImpl | null>(null);
  if (!storeRef.current) {
    storeRef.current = new QRStoreImpl(initialConfig);
  }
  return (
    <QRStoreContext.Provider value={storeRef.current}>
      {children}
    </QRStoreContext.Provider>
  );
};

export const useQRStore = (): QRStoreImpl => {
  const store = useContext(QRStoreContext);
  if (!store) throw new Error('useQRStore must be used within QRProvider');
  return store;
};

export const useQRStoreSelector = <T,>(selector: (state: QRStoreState) => T): T => {
  const store = useQRStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
};

const noopSubscribe = (_cb: () => void) => () => {};

export const useQRContext = (): QRContextType => {
  const store = useQRStore();
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState(),
    () => store.getState(),
  );
  return {
    config: state.config,
    moduleCount: state.moduleCount,
    preferences: state.preferences,
    updateConfig: (updates) => store.updateConfig(updates),
    updatePreferences: (updates) => store.updatePreferences(updates),
    emitSignal: (name, detail) => store.emitSignal(name, detail),
    registerSignal: (name, callback) => store.registerSignal(name, callback),
  };
};

export const useOptionalQRContext = (): QRContextType | undefined => {
  const store = useContext(QRStoreContext);
  const state = useSyncExternalStore(
    store ? (cb: () => void) => store.subscribe(cb) : noopSubscribe,
    store ? () => store.getState() : () => null,
    store ? () => store.getState() : () => null,
  );
  if (!store || !state) return undefined;
  return {
    config: state.config,
    moduleCount: state.moduleCount,
    preferences: state.preferences,
    updateConfig: (updates) => store.updateConfig(updates),
    updatePreferences: (updates) => store.updatePreferences(updates),
    emitSignal: (name, detail) => store.emitSignal(name, detail),
    registerSignal: (name, callback) => store.registerSignal(name, callback),
  };
};
