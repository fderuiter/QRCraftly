import React, { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';
import { sanitizeConfig } from '@/packages/qr-payload';

/**
 * Payload of the `scannability-fail` signal. It stays in memory on this device and only
 * carries non-sensitive diagnostic fields, never QR content.
 */
interface ScannabilityFailDetail {
  /** Decoder engine that reported the failure. */
  engine?: string;
  /** QR style in use. */
  styleId?: string;
  /** Failure classification. */
  errorType?: string;
}

/**
 * Signal names mapped to their payload types.
 */
interface SignalPayloads {
  'scannability-fail': ScannabilityFailDetail;
}

type SignalName = keyof SignalPayloads;
type SignalCallback<N extends SignalName> = (detail: SignalPayloads[N]) => void;

/**
 * Snapshot held by a QR store.
 */
export type QRState = {
  /** Sanitised QR configuration. */
  config: QRConfig;
  /** Module count of the last rendered matrix. */
  moduleCount: number;
  /**
   * Whether scannability fallback mode is active. The store is its single owner: it is set
   * by the `scannability-fail` signal and reset only when content (type/value) or the
   * error correction level changes.
   */
  isScannabilityFallbackActive: boolean;
};

/**
 * External store API for one generator instance.
 */
export interface QRStore {
  /** Returns the current snapshot. */
  getState: () => QRState;
  /** Subscribes to changes; returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Merges, sanitises and applies config updates. No-op updates do not notify. */
  updateConfig: (updates: Partial<QRConfig>) => void;
  /** Records the rendered matrix module count. */
  setModuleCount: (count: number) => void;
  /** Sets the scannability fallback flag. */
  setScannabilityFallbackActive: (active: boolean) => void;
  /** Emits a typed signal. */
  emitSignal: <N extends SignalName>(name: N, detail: SignalPayloads[N]) => void;
  /** Registers a typed signal callback; returns an unregister function. */
  registerSignal: <N extends SignalName>(name: N, callback: SignalCallback<N>) => () => void;
}

const QRStoreContext = createContext<QRStore | undefined>(undefined);

/** Config fields whose change invalidates a scannability fallback decision. */
const FALLBACK_RESET_FIELDS: ReadonlyArray<keyof QRConfig> = ['type', 'value', 'errorCorrectionLevel'];

function shallowEqualConfig(a: QRConfig, b: QRConfig): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof QRConfig)[]);
  for (const key of keys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Fields that carry QR content or free text a visitor typed. They are never retained
 * across routes; each generator route starts with its own content.
 */
const NON_RETAINED_FIELDS: ReadonlySet<keyof QRConfig> = new Set<keyof QRConfig>([
  'type',
  'value',
  'animationValues',
  'isAnimating',
  'borderText',
  'templateHeadline',
  'templateSubtext',
]);

/**
 * Appearance-only settings kept in volatile module memory so they survive client-side
 * navigation between generator routes. Never persisted: a reload or new tab starts fresh.
 */
let retainedAppearance: Partial<QRConfig> | null = null;

function pickAppearance(config: QRConfig): Partial<QRConfig> {
  const appearance: Partial<QRConfig> = {};
  for (const key of Object.keys(config) as (keyof QRConfig)[]) {
    if (!NON_RETAINED_FIELDS.has(key)) {
      (appearance as Record<string, unknown>)[key] = config[key];
    }
  }
  return appearance;
}

/**
 * Forgets appearance retained from earlier generator routes.
 */
export function clearRetainedAppearance(): void {
  retainedAppearance = null;
}

function createQRStore(initialConfig?: Partial<QRConfig>, retainAppearance = false): QRStore {
  let state: QRState = {
    config: { ...DEFAULT_CONFIG, ...initialConfig, ...(retainAppearance ? retainedAppearance : null) },
    moduleCount: 0,
    isScannabilityFallbackActive: false,
  };

  const listeners = new Set<() => void>();
  const signals: { [N in SignalName]: Set<SignalCallback<N>> } = {
    'scannability-fail': new Set(),
  };

  const setState = (next: QRState) => {
    state = next;
    listeners.forEach(l => l());
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
      const sanitized = sanitizeConfig({ ...state.config, ...updates });
      if (shallowEqualConfig(sanitized, state.config)) return;
      if (retainAppearance) retainedAppearance = pickAppearance(sanitized);
      const resetsFallback = FALLBACK_RESET_FIELDS.some(key => !Object.is(sanitized[key], state.config[key]));
      setState({
        ...state,
        config: sanitized,
        isScannabilityFallbackActive: resetsFallback ? false : state.isScannabilityFallbackActive,
      });
    },
    setScannabilityFallbackActive: (active) => {
      if (state.isScannabilityFallbackActive !== active) {
        setState({ ...state, isScannabilityFallbackActive: active });
      }
    },
    setModuleCount: (count) => {
      if (state.moduleCount !== count) {
        setState({ ...state, moduleCount: count });
      }
    },
    emitSignal: (name, detail) => {
      signals[name].forEach(cb => cb(detail));
    },
    registerSignal: (name, callback) => {
      const set = signals[name];
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    }
  };

  // Scannability failures switch the store (the single owner) into fallback mode.
  store.registerSignal('scannability-fail', () => {
    store.setScannabilityFallbackActive(true);
  });

  return store;
}

/**
 * Provides one QR store to a generator instance.
 * @param root0 - Component properties.
 * @param root0.children - The generator tree.
 * @param root0.initialConfig - Route-specific initial configuration (for example the QR type).
 * @param root0.retainAppearance - Carry appearance-only settings (never content) over from the
 *   previous generator route, in memory only.
 * @returns The provider element.
 */
export const QRProvider = ({ children, initialConfig, retainAppearance = false }: { children: React.ReactNode, initialConfig?: Partial<QRConfig>, retainAppearance?: boolean }) => {
  const [store] = useState(() => createQRStore(initialConfig, retainAppearance));

  return (
    <QRStoreContext.Provider value={store}>
      {children}
    </QRStoreContext.Provider>
  );
};

const noopSubscribe = () => () => {};

/**
 * Selects a slice of the nearest QR store, or undefined outside a `QRProvider`.
 * Selectors should return primitives or stable references to avoid extra renders.
 * @param selector - Picks the slice a consumer needs.
 * @returns The selected slice, or undefined without a provider.
 */
export function useOptionalQRStoreSelector<T>(selector: (state: QRState) => T): T | undefined {
  const store = useContext(QRStoreContext);
  
  const subscribe = store ? store.subscribe : noopSubscribe;
  const getSnapshot = () => store ? selector(store.getState()) : undefined;
  
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

/**
 * Selects a slice of the nearest QR store. Throws outside a `QRProvider`.
 * @param selector - Picks the slice a consumer needs.
 * @returns The selected slice.
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
 * Returns the nearest QR store. Throws outside a `QRProvider`.
 * @returns The store.
 */
export function useQRStore() {
  const store = useContext(QRStoreContext);
  if (!store) {
    throw new Error('useQRStore must be used within QRProvider');
  }
  return store;
}
