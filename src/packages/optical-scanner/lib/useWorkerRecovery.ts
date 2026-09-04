import { useRef, useCallback, useEffect } from 'react';
import { getScannerWorker, terminateScannerWorker } from './workerRunner';
import { AdaptiveFrameScheduler } from './scheduler';

export interface UseWorkerRecoveryOptions {
  onMessage: (e: MessageEvent) => void;
  getScheduler: () => AdaptiveFrameScheduler;
}

/**
 * Manages the background scanner Web Worker lifecycle, thread-level error boundaries,
 * event listener attachment/detachment, and exponential backoff restart cycles.
 */
export function useWorkerRecovery({ onMessage, getScheduler }: UseWorkerRecoveryOptions) {
  const workerRef = useRef<Worker | null>(null);
  const consecutiveRestartAttemptsRef = useRef<number>(0);
  const epochRef = useRef<number>(1);
  const useMainThreadFallbackRef = useRef<boolean>(false);

  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const attachedListenersRef = useRef<{
    worker: Worker;
    onMsg: (e: MessageEvent) => void;
    onErr: (err: any) => void;
    onMsgErr: (err: any) => void;
  } | null>(null);

  const detachWorkerListeners = useCallback(() => {
    if (attachedListenersRef.current) {
      const { worker, onMsg, onErr, onMsgErr } = attachedListenersRef.current;
      try {
        if (typeof worker.removeEventListener === 'function') {
          worker.removeEventListener('message', onMsg);
          worker.removeEventListener('error', onErr);
          worker.removeEventListener('messageerror', onMsgErr);
        } else {
          (worker as any).onmessage = null;
          (worker as any).onerror = null;
        }
      } catch (e) {
        console.error('Failed to detach worker listeners:', e);
      }
      attachedListenersRef.current = null;
    }
  }, []);

  const recreateWorkerRef = useRef<() => void>(() => {});

  const attachWorkerListeners = useCallback(
    (worker: Worker) => {
      detachWorkerListeners();

      const onMsg = (e: MessageEvent) => onMessageRef.current(e);
      const onErr = (err: any) => {
        console.error('Worker thread-level runtime boundary error:', err);
        recreateWorkerRef.current();
      };
      const onMsgErr = (err: any) => {
        console.error('Worker thread-level message data transfer error:', err);
        recreateWorkerRef.current();
      };

      try {
        if (typeof worker.addEventListener === 'function') {
          worker.addEventListener('message', onMsg);
          worker.addEventListener('error', onErr);
          worker.addEventListener('messageerror', onMsgErr);
        } else {
          (worker as any).onmessage = onMsg;
          (worker as any).onerror = onErr;
        }
        attachedListenersRef.current = {
          worker,
          onMsg,
          onErr,
          onMsgErr,
        };
      } catch (err) {
        console.warn('Failed to attach worker listeners:', err);
      }
    },
    [detachWorkerListeners]
  );

  const recreateWorker = useCallback(() => {
    consecutiveRestartAttemptsRef.current += 1;
    if (consecutiveRestartAttemptsRef.current > 3) {
      console.warn('Scanner background worker crashed repeatedly. Activating main-thread fallback.');
      useMainThreadFallbackRef.current = true;
      detachWorkerListeners();
      terminateScannerWorker();
      workerRef.current = null;
      getScheduler().triggerRecovery(1500, false);
      return;
    }

    console.warn(
      `Watchdog: Recreating worker. Attempt ${consecutiveRestartAttemptsRef.current} of 3 consecutive retries.`
    );

    epochRef.current += 1;
    const nextTimeout = Math.min(6000, 1500 * Math.pow(2, consecutiveRestartAttemptsRef.current));
    getScheduler().setWatchdogTimeout(nextTimeout);

    detachWorkerListeners();
    terminateScannerWorker();
    workerRef.current = null;

    getScheduler().triggerRecovery(nextTimeout, false);

    if (typeof window === 'undefined') return;
    try {
      const worker = getScannerWorker();
      workerRef.current = worker;
      attachWorkerListeners(worker);
    } catch (err) {
      console.warn('Failed to recreate worker, activating main-thread fallback:', err);
      useMainThreadFallbackRef.current = true;
      workerRef.current = null;
    }
  }, [attachWorkerListeners, detachWorkerListeners, getScheduler]);

  useEffect(() => {
    recreateWorkerRef.current = recreateWorker;
  }, [recreateWorker]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = getScannerWorker();
      workerRef.current = worker;
      attachWorkerListeners(worker);
    } catch (err) {
      console.warn('Failed to initialize background scanner worker, activating main-thread fallback:', err);
      useMainThreadFallbackRef.current = true;
      workerRef.current = null;
    }

    return () => {
      detachWorkerListeners();
      workerRef.current = null;
    };
  }, [attachWorkerListeners, detachWorkerListeners]);

  const resetRestartCounter = useCallback(() => {
    consecutiveRestartAttemptsRef.current = 0;
  }, []);

  const incrementEpoch = useCallback(() => {
    epochRef.current += 1;
  }, []);

  return {
    workerRef,
    epochRef,
    useMainThreadFallbackRef,
    recreateWorker,
    resetRestartCounter,
    incrementEpoch,
    detachWorkerListeners,
  };
}

