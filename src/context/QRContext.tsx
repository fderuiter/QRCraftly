import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { QRConfig, QRErrorCorrectionLevel } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';
import { ValidationEngine } from '@/engine/ValidationEngine';

/**
 *
 */
type SignalName = 'scannability-fail' | 'render-complete';
/**
 *
 */
type SignalCallback = (detail: any) => void;

/**
 *
 */
export type ActiveOptimizations = {
  /**
   *
   */
  errorCorrectionLevel?: QRErrorCorrectionLevel;
  /**
   *
   */
  moduleScale?: number;
};

/**
 *
 */
type QRState = {
  /**
   *
   */
  config: QRConfig;
  /**
   *
   */
  moduleCount: number;
  /**
   *
   */
  preferences: { /**
                  *
                  */
  telemetryOptIn: boolean | null; /**
                                   *
                                   */
  darkMode: boolean };
  /**
   *
   */
  violations: string[];
  /**
   *
   */
  activeOptimizations?: ActiveOptimizations;
  /**
   *
   */
  effectiveConfig: QRConfig;
};

/**
 *
 */
export interface QRStore {
  /**
   *
   */
  getState: () => QRState;
  /**
   *
   */
  subscribe: (listener: () => void) => () => void;
  /**
   *
   */
  updateConfig: (updates: Partial<QRConfig>) => void;
  /**
   *
   */
  setModuleCount: (count: number) => void;
  /**
   *
   */
  updatePreferences: (updates: Partial<{/**
                                         *
                                         */
  telemetryOptIn: boolean | null, /**
                                   *
                                   */
  darkMode: boolean}>) => void;
  /**
   *
   */
  emitSignal: (name: SignalName, detail?: any) => void;
  /**
   *
   */
  registerSignal: (name: SignalName, callback: SignalCallback) => () => void;
  /**
   *
   */
  updateActiveOptimizations: (updates: ActiveOptimizations) => void;
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
    } catch (_e) {
      // Use fallback
    }
  }
  return {
    getItem: (key: string) => fallbackMemoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => { fallbackMemoryStore.set(key, value); }
  };
};

function calculateEffectiveConfig(config: QRConfig, activeOpts?: ActiveOptimizations): QRConfig {
  if (!config.autoOptimize || !activeOpts) {
    return config;
  }
  return {
    ...config,
    errorCorrectionLevel: activeOpts.errorCorrectionLevel ?? config.errorCorrectionLevel,
    moduleScale: activeOpts.moduleScale ?? 1.0,
  };
}

function createQRStore(initialConfig?: Partial<QRConfig>): QRStore {
  const storage = getSafeLocalStorage();
  const savedOptIn = storage.getItem('qr-telemetry-opt-in');
  
  const baseConfig = { ...DEFAULT_CONFIG, ...initialConfig } as QRConfig;
  const initialActiveOpts = {
    errorCorrectionLevel: undefined,
    moduleScale: undefined,
  };

  let state: QRState = {
    config: baseConfig,
    moduleCount: 0,
    preferences: {
      telemetryOptIn: savedOptIn === 'true' ? true : savedOptIn === 'false' ? false : null,
      darkMode: false,
    },
    violations: [],
    activeOptimizations: initialActiveOpts,
    effectiveConfig: calculateEffectiveConfig(baseConfig, initialActiveOpts),
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
      const sanitized = ValidationEngine.sanitizeConfig(proposed);
      
      let nextActiveOpts = state.activeOptimizations;
      if (
        updates.style !== undefined ||
        updates.value !== undefined ||
        updates.errorCorrectionLevel !== undefined ||
        updates.logoUrl !== undefined ||
        updates.autoOptimize !== undefined
      ) {
        nextActiveOpts = {
          errorCorrectionLevel: undefined,
          moduleScale: undefined,
        };
      }

      state = {
        ...state,
        config: sanitized,
        violations,
        activeOptimizations: nextActiveOpts,
        effectiveConfig: calculateEffectiveConfig(sanitized, nextActiveOpts),
      };
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
    },
    updateActiveOptimizations: (updates) => {
      const nextActiveOpts = {
        ...state.activeOptimizations,
        ...updates,
      };
      state = {
        ...state,
        activeOptimizations: nextActiveOpts,
        effectiveConfig: calculateEffectiveConfig(state.config, nextActiveOpts),
      };
      listeners.forEach(l => l());
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

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.initialConfig
 */
export const QRProvider = ({ children, initialConfig }: { children: React.ReactNode, initialConfig?: Partial<QRConfig> }) => {
  const [store] = useState(() => createQRStore(initialConfig));

  return (
    <QRStoreContext.Provider value={store}>
      {children}
    </QRStoreContext.Provider>
  );
};

/**
 *
 * @param selector
 */
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

/**
 *
 * @param selector
 */
export function useQRStoreSelector<T>(selector: (state: QRState) => T): T {
  const store = useQRStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

/**
 *
 */
export function useQRStore() {
  const store = useContext(QRStoreContext);
  if (!store) {
    throw new Error('useQRStore must be used within QRProvider');
  }
  return store;
}
