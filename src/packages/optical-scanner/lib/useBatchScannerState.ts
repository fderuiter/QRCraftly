import type { MutableRefObject } from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ScannerStatus } from './contracts';

export interface UseBatchScannerStateResult {
  status: ScannerStatus;
  samplingDelay: number;
  latencyHistory: number[];
  samplingDelayRef: MutableRefObject<number>;
  latencyHistoryRef: MutableRefObject<number[]>;
  updateState: (updates: {
    status?: ScannerStatus;
    samplingDelay?: number;
    latencyHistory?: number[];
  }) => void;
  resetState: () => void;
}

/**
 * Manages high-frequency scanner diagnostic state updates (status, delay, latency history).
 * In production, updates are batched to 250ms to prevent high-frequency React rerenders (up to 60 FPS).
 * In test environments, updates flush synchronously for deterministic assertions.
 */
export function useBatchScannerState(isScanning: boolean, batchIntervalMs = 250): UseBatchScannerStateResult {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [samplingDelay, setSamplingDelay] = useState<number>(33);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const internalStatusRef = useRef<ScannerStatus>('idle');
  const internalDelayRef = useRef<number>(33);
  const internalLatencyHistoryRef = useRef<number[]>([]);
  const isDirtyRef = useRef<boolean>(false);

  const isSynchronous =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');

  const updateState = useCallback(
    (updates: {
      status?: ScannerStatus;
      samplingDelay?: number;
      latencyHistory?: number[];
    }) => {
      if (updates.status !== undefined) {
        internalStatusRef.current = updates.status;
      }
      if (updates.samplingDelay !== undefined) {
        internalDelayRef.current = updates.samplingDelay;
      }
      if (updates.latencyHistory !== undefined) {
        internalLatencyHistoryRef.current = updates.latencyHistory;
      }

      if (isSynchronous) {
        if (updates.status !== undefined) setStatus(updates.status);
        if (updates.samplingDelay !== undefined) setSamplingDelay(updates.samplingDelay);
        if (updates.latencyHistory !== undefined) setLatencyHistory(updates.latencyHistory);
      } else {
        isDirtyRef.current = true;
      }
    },
    [isSynchronous]
  );

  const resetState = useCallback(() => {
    internalStatusRef.current = 'idle';
    setStatus('idle');
    isDirtyRef.current = false;
  }, []);

  useEffect(() => {
    if (!isScanning || isSynchronous) return;

    const intervalId = setInterval(() => {
      if (isDirtyRef.current) {
        setStatus(internalStatusRef.current);
        setSamplingDelay(internalDelayRef.current);
        setLatencyHistory(internalLatencyHistoryRef.current);
        isDirtyRef.current = false;
      }
    }, batchIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [isScanning, isSynchronous, batchIntervalMs]);

  return {
    status,
    samplingDelay,
    latencyHistory,
    samplingDelayRef: internalDelayRef,
    latencyHistoryRef: internalLatencyHistoryRef,
    updateState,
    resetState,
  };
}
