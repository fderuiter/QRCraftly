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


const releaseImageHandle = (handle: any) => {
  if (handle && typeof handle.close === 'function') {
    try {
      handle.close();
    } catch {}
  }
};

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

  const lastLatencyRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const isWorkerBusyRef = useRef<boolean>(false);

  const [localMetrics, setLocalMetrics] = useState<{ violations?: number; minContrast?: number } | undefined>();

  const health = useMemo<HealthScore>(() => {
    return ValidationEngine.calculateScannability(config, localMetrics);
  }, [config, localMetrics]);

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
    startTimeRef.current = null;
    isWorkerBusyRef.current = false;
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

        const { success, physicalReady, error, configId, localContrastViolations, minLocalContrast } = e.data;

        // Sequence ID check: discard late results if configId does not match current sequence ID
        if (configId !== String(sequenceRef.current)) {
          return;
        }

        if (startTimeRef.current !== null) {
          lastLatencyRef.current = performance.now() - startTimeRef.current;
          startTimeRef.current = null;
        }
        isWorkerBusyRef.current = false;

        if (localContrastViolations !== undefined) {
          setLocalMetrics({ violations: localContrastViolations, minContrast: minLocalContrast });
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
        startTimeRef.current = null;
        isWorkerBusyRef.current = false;
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
      isWorkerBusyRef.current = false;
      startTimeRef.current = null;
    };
  }, []);

  // Expose a function to trigger check
  const checkScannability = useCallback((overrideImageData?: ImageData, overrideImageBitmap?: ImageBitmap, overrideModuleCount?: number) => {
    const worker = getOrInitWorker();

    // Backpressure guard: drops/skips frames when background worker is busy and latency is high
    if (worker && isWorkerBusyRef.current && lastLatencyRef.current > 16.6) {
      if (overrideImageBitmap) {
        releaseImageHandle(overrideImageBitmap);
      }
      return;
    }

    setStatus('checking');
    sequenceRef.current += 1;
    const currentSequence = String(sequenceRef.current);

    const storeModuleCount = store ? store.getState().moduleCount : undefined;
    const moduleCountToUse = (overrideModuleCount && overrideModuleCount > 0) ? overrideModuleCount : (storeModuleCount && storeModuleCount > 0 ? storeModuleCount : undefined);

    if (!worker) {
      // Worker failed or isn't supported, run on the main thread!
      const runMainThreadCheck = async () => {
        if (overrideImageBitmap) {
          try {
            if (currentSequence === String(sequenceRef.current)) {
              const { performScannabilityCheck } = await import('../utils/scannabilityChecker');
              let imageData: ImageData | null = null;

              if (typeof OffscreenCanvas !== 'undefined') {
                const canvas = new OffscreenCanvas(overrideImageBitmap.width || 1, overrideImageBitmap.height || 1);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(overrideImageBitmap, 0, 0);
                  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }
              } else if (typeof document !== 'undefined') {
                const canvas = document.createElement('canvas');
                canvas.width = overrideImageBitmap.width || 1;
                canvas.height = overrideImageBitmap.height || 1;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(overrideImageBitmap, 0, 0);
                  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }
              }

              if (imageData && currentSequence === String(sequenceRef.current)) {
                try {
                  const isTest = !!navigator.webdriver;
                  const result = performScannabilityCheck(imageData, imageData.width, imageData.height, isTest);
                  if (currentSequence === String(sequenceRef.current)) {
                    setStatus(result.success ? (result.physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');
                    if (!result.success && result.error) {
                      store.emitSignal('scannability-fail', {
                        engine,
                        styleId: config.style || 'default',
                        errorType: result.error
                      });
                    }
                  }
                } catch (err) {
                  console.error("Main-thread fallback processing failed:", err);
                  if (currentSequence === String(sequenceRef.current)) {
                    setStatus('fail');
                    store.emitSignal('scannability-fail', {
                      engine,
                      styleId: config.style || 'default',
                      errorType: 'VALIDATION_ERROR'
                    });
                  }
                }
              }
            }
          } finally {
            releaseImageHandle(overrideImageBitmap);
          }
          return;
        }

        const { performScannabilityCheck } = await import('../utils/scannabilityChecker');
        const performValidation = (imgData: ImageData) => {
          try {
            const isTest = !!navigator.webdriver;
            const result = performScannabilityCheck(imgData, imgData.width, imgData.height, isTest, moduleCountToUse);
            if (currentSequence !== String(sequenceRef.current)) return;
            if (result.localContrastViolations !== undefined) {
              setLocalMetrics({ violations: result.localContrastViolations, minContrast: result.minLocalContrast });
            }
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
        (window as any).requestIdleCallback(runMainThreadCheck, { timeout: 100 });
      } else {
        setTimeout(runMainThreadCheck, 100);
      }
      return;
    }

    // Set worker state as busy and start time
    isWorkerBusyRef.current = true;
    startTimeRef.current = performance.now();

    // If virtual renderer provided deterministic ImageBitmap, use it directly
    if (overrideImageBitmap) {
      if (currentSequence !== String(sequenceRef.current)) {
        releaseImageHandle(overrideImageBitmap);
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
        return;
      }

      const payload = {
        imageBitmap: overrideImageBitmap,
        width: overrideImageBitmap.width,
        height: overrideImageBitmap.height,
        isTest: !!navigator.webdriver,
        configId: currentSequence,
        moduleCount: moduleCountToUse,
      };
      try {
        assertWorkerRequest(payload);
        worker.postMessage(payload, [payload.imageBitmap]);
      } catch (err) {
        console.error("Outgoing worker request validation failed:", err);
        setStatus('fail');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
        releaseImageHandle(overrideImageBitmap);
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
        moduleCount: moduleCountToUse,
      };
      try {
        assertWorkerRequest(payload);
        // Do not transfer the raw TypedArray directly to prevent memory neutering and re-allocation loops
        worker.postMessage(payload, []);
      } catch (err) {
        console.error("Outgoing worker request validation failed:", err);
        setStatus('fail');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
      }
      return;
    }

    // Capture main canvas state asynchronously as an ImageBitmap handle
    const runCaptureAndSend = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('idle');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
        return;
      }

      if (canvas.width === 0 || canvas.height === 0) {
        setStatus('idle');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
        return;
      }

      // Check if createImageBitmap is supported
      if (typeof globalThis.createImageBitmap === 'function') {
        createImageBitmap(canvas).then((imageBitmap) => {
          if (currentSequence !== String(sequenceRef.current)) {
            imageBitmap.close();
            isWorkerBusyRef.current = false;
            startTimeRef.current = null;
            return;
          }
          const payload = {
            imageBitmap,
            width: canvas.width,
            height: canvas.height,
            isTest: !!navigator.webdriver,
            configId: currentSequence,
            moduleCount: moduleCountToUse,
          };
          try {
            assertWorkerRequest(payload);
            worker.postMessage(payload, [payload.imageBitmap]);
          } catch (err) {
            console.error("Outgoing worker request validation failed:", err);
            setStatus('fail');
            isWorkerBusyRef.current = false;
            startTimeRef.current = null;
            imageBitmap.close();
          }
        }).catch((err) => {
          console.error("createImageBitmap failed, falling back to synchronous read:", err);
          readAndSendFallback();
        });
      } else {
        readAndSendFallback();
      }
    };

    // Fallback synchronous canvas read
    const readAndSendFallback = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('idle');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
        return;
      }
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatus('fail');
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const payload = {
          imageData,
          width: canvas.width,
          height: canvas.height,
          isTest: !!navigator.webdriver,
          configId: currentSequence,
          moduleCount: moduleCountToUse,
        };
        assertWorkerRequest(payload);
        // Do not transfer the raw TypedArray directly to prevent memory neutering and re-allocation loops
        worker.postMessage(payload, []);
      } catch (err) {
        console.error("Failed to read canvas data or validation failed", err);
        setStatus('fail');
        isWorkerBusyRef.current = false;
        startTimeRef.current = null;
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runCaptureAndSend, { timeout: 100 });
    } else {
      setTimeout(runCaptureAndSend, 100);
    }
  }, [canvasRef, getOrInitWorker, config, store, engine]);

  return { status, checkScannability, health, workerRecoveryActive };
}
