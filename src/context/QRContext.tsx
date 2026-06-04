import React, { createContext, useContext, useCallback, useSyncExternalStore, useEffect } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';

type SignalName = 'scannability-fail' | 'render-complete';
type SignalCallback = (detail: any) => void;

interface QRPreferences {
  telemetryOptIn: boolean | null;
  darkMode: boolean;
}

interface QRStoreState {
  config: QRConfig;
  preferences: QRPreferences;
  moduleCount: number;
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

const asyncPersist = (() => {
  const queue: { key: string; value: string; retries: number }[] = [];
  let isProcessing = false;

  const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;

    while (queue.length > 0) {
      const item = queue[0];
      try {
        const storage = getSafeLocalStorage();
        storage.setItem(item.key, item.value);
        queue.shift(); // Success, remove from queue
      } catch (err) {
        if (item.retries > 0) {
          item.retries--;
          // Wait before retry
          await new Promise(r => setTimeout(r, 1000));
        } else {
          queue.shift(); // Max retries reached, discard
        }
      }
    }
    isProcessing = false;
  };

  return (key: string, value: string) => {
    queue.push({ key, value, retries: 3 });
    // Run as macrotask to defer after paint
    setTimeout(processQueue, 0);
  };
})();

class QRStore {
  private state: QRStoreState;
  private listeners = new Set<() => void>();
  private signals: Record<SignalName, Set<SignalCallback>> = {
    'scannability-fail': new Set(),
    'render-complete': new Set(),
  };

  constructor(initialConfig?: Partial<QRConfig>) {
    const storage = getSafeLocalStorage();
    const savedOptIn = storage.getItem('qr-telemetry-opt-in');
    const savedDarkMode = storage.getItem('qr-dark-mode');

    this.state = {
      config: { ...DEFAULT_CONFIG, ...initialConfig },
      preferences: {
        telemetryOptIn: savedOptIn === 'true' ? true : savedOptIn === 'false' ? false : null,
        darkMode: savedDarkMode === 'true',
      },
      moduleCount: 0,
    };
  }

  getState = () => this.state;

  setState = (next: Partial<QRStoreState>) => {
    this.state = { ...this.state, ...next };
    this.listeners.forEach(l => l());
  }

  updateConfig = (updates: Partial<QRConfig>) => {
    this.setState({ config: { ...this.state.config, ...updates } });
  }

  updatePreferences = (updates: Partial<QRPreferences>) => {
    const newPrefs = { ...this.state.preferences, ...updates };
    this.setState({ preferences: newPrefs });

    if (updates.telemetryOptIn !== undefined && updates.telemetryOptIn !== null) {
      asyncPersist('qr-telemetry-opt-in', String(updates.telemetryOptIn));
    }
    if (updates.darkMode !== undefined) {
      asyncPersist('qr-dark-mode', String(updates.darkMode));
    }
  }

  setModuleCount = (moduleCount: number) => {
    if (this.state.moduleCount !== moduleCount) {
      this.setState({ moduleCount });
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerSignal = (name: SignalName, callback: SignalCallback) => {
    this.signals[name].add(callback);
    return () => {
      this.signals[name].delete(callback);
    };
  }

  emitSignal = (name: SignalName, detail?: any) => {
    this.signals[name].forEach(cb => cb(detail));
  }
}

const QRContext = createContext<QRStore | undefined>(undefined);

export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const [store] = React.useState(() => new QRStore(initialConfig));

  useEffect(() => {
    const unsub = store.registerSignal('render-complete', (detail) => {
      if (detail && detail.moduleCount) {
        store.setModuleCount(detail.moduleCount);
      }
    });
    return unsub;
  }, [store]);

  return (
    <QRContext.Provider value={store}>
      {children}
    </QRContext.Provider>
  );
};

export const useQRStore = () => {
  const store = useContext(QRContext);
  if (!store) throw new Error("useQRStore must be used within QRProvider");
  return store;
};

// Custom selector hook for atomic re-renders
export function useQRStoreSelector<R>(selector: (state: QRStoreState) => R): R {
  const store = useQRStore();
  
  // To avoid issues where the selector function itself changes (e.g., inline arrow function),
  // we memoize the selected value manually.
  const memoRef = React.useRef<{ state: QRStoreState, selected: R, selector: (state: QRStoreState) => R }>(null as any);

  const getMemoizedSnapshot = useCallback(() => {
    const nextState = store.getState();
    // Use the ref inside the callback, which is called by React outside of the render phase
    // or during it, but we can manage the cache safely here.
    if (!memoRef.current) {
      memoRef.current = { state: nextState, selected: selector(nextState), selector };
    } else if (selector !== memoRef.current.selector) {
      // Selector function changed, recompute
      memoRef.current.selector = selector;
      memoRef.current.state = nextState;
      memoRef.current.selected = selector(nextState);
    } else if (nextState !== memoRef.current.state) {
      memoRef.current.state = nextState;
      const nextSelected = selector(nextState);
      if (!Object.is(memoRef.current.selected, nextSelected)) {
        memoRef.current.selected = nextSelected;
      }
    }
    return memoRef.current.selected;
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getMemoizedSnapshot, getMemoizedSnapshot);
}

// Backward compatible hook, mimicking old behavior but avoiding global re-renders
// if we break it down in consumers.
export const useQRContext = () => {
  const store = useQRStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  
  return {
    config: state.config,
    updateConfig: store.updateConfig,
    emitSignal: store.emitSignal,
    registerSignal: store.registerSignal,
    preferences: state.preferences,
    updatePreferences: store.updatePreferences,
    moduleCount: state.moduleCount
  };
};

export const useOptionalQRContext = () => {
  const store = useContext(QRContext);

  const state = useSyncExternalStore(
    store ? store.subscribe : () => () => {},
    store ? store.getState : () => ({} as QRStoreState),
    store ? store.getState : () => ({} as QRStoreState)
  );

  if (!store || !state.config) return undefined;

  return {
    config: state.config,
    updateConfig: store.updateConfig,
    emitSignal: store.emitSignal,
    registerSignal: store.registerSignal,
    preferences: state.preferences,
    updatePreferences: store.updatePreferences,
    moduleCount: state.moduleCount
  };
};
