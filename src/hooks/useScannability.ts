import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { QRConfig } from '../types';
import { useQRStore } from '@/context/QRContext';
import { ValidationEngine } from '../engine/ValidationEngine';
import { useCapabilities } from './useCapabilities';
import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerResponse,
} from '../utils/sharedContract';
import { performScannabilityCheck } from '../utils/scannabilityChecker';


/**
 *
 */
export type ScannabilityStatus = 'idle' | 'checking' | 'digital-pass' | 'physical-pass' | 'fail';

/**
 *
 */
export interface HealthScore {
  /**
   *
   */
  score: number;
  /**
   *
   */
  warnings: string[];
}

/**
 *
 * @param canvasRef
 * @param config
 */
export function useScannability(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: QRConfig) {
  const [status, setStatus] = useState<ScannabilityStatus>('idle');
  const [workerRecoveryActive, setWorkerRecoveryActive] = useState(false);
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const sequenceRef = useRef<number>(0);
  const store = useQRStore();
  const { engine } = useCapabilities();
  const workerUnsupportedRef = useRef(false);

  const health = useMemo<HealthScore>(() => {
    return ValidationEngine.calculateScannability(config);
  }, [config]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleError = useCallback((err: any) => {
    console.error("Worker error, transitioning immediately to fail state:", err);

    setStatus('fail');
    store.emitSignal('scannability-fail', {
      engine,
      styleId: configRef.current.style || 'default',
      errorType: 'WORKER_ERROR'
    });

    setWorkerRecoveryActive(true);

    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch {}
      workerRef.current = null;
    }
    setActiveWorker(null);
  }, [store, engine]);

  const getOrInitWorker = useCallback(() => {
    if (workerUnsupportedRef.current) return null;
    if (workerRef.current) return workerRef.current;
    if (typeof window === 'undefined') return null;

    try {
      const worker = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      setActiveWorker(worker);

      worker.addEventListener('error', handleError);

      return worker;
    } catch (err) {
      console.error("Failed to initialize Worker, transitioning immediately to fail state:", err);
      
      if (statusRef.current === 'checking') {
        setStatus('fail');
        store.emitSignal('scannability-fail', {
          engine,
          styleId: configRef.current.style || 'default',
          errorType: 'WORKER_ERROR'
        });
        setWorkerRecoveryActive(true);
      }

      workerUnsupportedRef.current = true;
      workerRef.current = null;
      setActiveWorker(null);

      return null;
    }
  }, [handleError, store, engine]);

  useEffect(() => {
    const worker = getOrInitWorker();
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        if (!isWorkerResponse(e.data)) {
          assertWorkerResponse(e.data);
        } else {
          assertWorkerResponse(e.data);
        }

        const { success, physicalReady, error, configId } = e.data;

        // Sequence ID check: discard if configId does not match current sequence ID
        if (configId !== String(sequenceRef.current)) {
          return;
        }

        setStatus(success ? (physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');

        if (!success && error) {
          store.emitSignal('scannability-fail', {
            engine,
            styleId: configRef.current.style || 'default',
            errorType: error
          });
        }

        // Successful message received means background worker is healthy
        setWorkerRecoveryActive(false);
      } catch (err) {
        console.error("Worker response validation failed:", err);
        setStatus('fail');
        store.emitSignal('scannability-fail', {
          engine,
          styleId: configRef.current.style || 'default',
          errorType: 'VALIDATION_ERROR'
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [config, store, engine, getOrInitWorker, activeWorker]);

  // Handle worker cleanup on full unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Expose a function to trigger check
  const checkScannability = useCallback((overrideImageData?: ImageData) => {
    const worker = getOrInitWorker();

    setStatus('checking');
    sequenceRef.current += 1;
    const currentSequence = String(sequenceRef.current);

    if (!worker) {
      // Worker failed or isn't supported, run on the main thread!
      const runMainThreadCheck = () => {
        const performValidation = (imgData: ImageData) => {
          try {
            const isTest = !!navigator.webdriver;
            const result = performScannabilityCheck(imgData, imgData.width, imgData.height, isTest);
            if (currentSequence !== String(sequenceRef.current)) return;
            setStatus(result.success ? (result.physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');
            if (!result.success && result.error) {
              store.emitSignal('scannability-fail', {
                engine,
                styleId: config.style || 'default',
                errorType: result.error
              });
            }
          } catch (err) {
            console.error("Main-thread fallback processing failed:", err);
            if (currentSequence !== String(sequenceRef.current)) return;
            setStatus('fail');
            store.emitSignal('scannability-fail', {
              engine,
              styleId: config.style || 'default',
              errorType: 'VALIDATION_ERROR'
            });
          }
        };

        if (overrideImageData) {
          performValidation(overrideImageData);
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          setStatus('idle');
          return;
        }

        // Make sure canvas actually has dimensions
        if (canvas.width === 0 || canvas.height === 0) {
          setStatus('idle');
          return;
        }

        try {
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setStatus('fail');
            return;
          }
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          performValidation(imageData);
        } catch (err) {
          console.error("Failed to read canvas data for fallback validation", err);
          setStatus('fail');
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runMainThreadCheck);
      } else {
        setTimeout(runMainThreadCheck, 100);
      }
      return;
    }

    // If virtual renderer provided deterministic image data, use it directly
    if (overrideImageData) {
      const payload = {
        imageData: overrideImageData,
        width: overrideImageData.width,
        height: overrideImageData.height,
        isTest: !!navigator.webdriver,
        configId: currentSequence,
      };
      try {
        assertWorkerRequest(payload);
        worker.postMessage(payload, [payload.imageData.data.buffer]);
      } catch (err) {
        console.error("Outgoing worker request validation failed:", err);
        setStatus('fail');
      }
      return;
    }

    // Fallback: Use requestIdleCallback or setTimeout to read canvas data without blocking
    const readAndSend = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('idle');
        return;
      }
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatus('fail');
          return;
        }
        
        // Make sure canvas actually has dimensions
        if (canvas.width === 0 || canvas.height === 0) {
          setStatus('idle');
          return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const payload = {
          imageData,
          width: canvas.width,
          height: canvas.height,
          isTest: !!navigator.webdriver,
          configId: currentSequence,
        };
        assertWorkerRequest(payload);
        worker.postMessage(payload, [payload.imageData.data.buffer]);
      } catch (err) {
        console.error("Failed to read canvas data or validation failed", err);
        setStatus('fail');
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(readAndSend);
    } else {
      setTimeout(readAndSend, 100);
    }
  }, [canvasRef, getOrInitWorker, config, store, engine]);

  return { status, checkScannability, health, workerRecoveryActive };
}
