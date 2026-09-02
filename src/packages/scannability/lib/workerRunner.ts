/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { QRConfig } from '@/types';
import { useQRStore } from '@/context/QRContext';
import { useCapabilities } from '@/hooks/useCapabilities';
import {
  assertWorkerRequest,
  assertWorkerResponse,
  isWorkerResponse,
} from './sharedContract';
import { calculateScannabilityHealth, HealthScore } from './scoring';
import { ScannabilityStatus } from './exportRiskPolicy';

import { releaseImageHandle } from './imageHandle';

const SCANNABILITY_WATCHDOG_MS = 1500;


export interface UseScannabilityReturn {
  status: ScannabilityStatus;
  checkScannability: (
    overrideImageData?: ImageData,
    overrideImageBitmap?: ImageBitmap,
    overrideModuleCount?: number
  ) => void;
  health: HealthScore;
  workerRecoveryActive: boolean;
}

const scheduleIdleTask = (cb: () => void, timeout = 100): void => {
  const win = typeof window !== 'undefined' ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }) : undefined;
  if (win && typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, timeout);
  }
};

/**
 * Deep hook managing off-thread worker concurrency, watchdog fault-tolerance,
 * sequence tracking, localized contrast audits, and health score aggregation.
 *
 * @param canvasRef - Ref to the preview canvas element.
 * @param config - Current QR code configuration profile.
 * @returns Scannability Health state and trigger method.
 */
export function useScannabilityRunner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: QRConfig
): UseScannabilityReturn {
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
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogFallbackRef = useRef<(() => void) | null>(null);
  const consecutiveTimeoutsRef = useRef(0);
  const pendingModuleCountRef = useRef<number | undefined>(undefined);
  const hasWorkerOffscreenDegradationRef = useRef<boolean>(false);

  const [localMetrics, setLocalMetrics] = useState<
    { violations?: number; minContrast?: number } | undefined
  >();

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const health = useMemo<HealthScore>(() => {
    return calculateScannabilityHealth(config, localMetrics);
  }, [config, localMetrics]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleError = useCallback(
    (err: any) => {
      console.error('Worker error, transitioning immediately to fail state:', err);

      setStatus('fail');
      store.emitSignal('scannability-fail', {
        engine,
        styleId: configRef.current.style || 'default',
        errorType: 'WORKER_ERROR',
      });

      setWorkerRecoveryActive(true);

      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch {}
        workerRef.current = null;
      }
      setActiveWorker(null);
      clearWatchdog();
      startTimeRef.current = null;
      isWorkerBusyRef.current = false;
    },
    [store, engine, clearWatchdog]
  );

  const getOrInitWorker = useCallback(() => {
    if (workerUnsupportedRef.current) return null;
    if (workerRef.current) return workerRef.current;
    if (typeof window === 'undefined') return null;

    try {
      const worker = new Worker(new URL('../worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
      setActiveWorker(worker);

      worker.addEventListener('error', handleError);

      return worker;
    } catch (err) {
      console.error('Failed to initialize Worker, transitioning immediately to fail state:', err);

      if (statusRef.current === 'checking') {
        setStatus('fail');
        store.emitSignal('scannability-fail', {
          engine,
          styleId: configRef.current.style || 'default',
          errorType: 'WORKER_ERROR',
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

        const { configId } = e.data;

        // Handle superseded dropped ACKs before sequence checks to release backpressure deadlock
        if ('dropped' in e.data && e.data.dropped) {
          startTimeRef.current = null;
          isWorkerBusyRef.current = false;
          if (configId === String(sequenceRef.current)) {
            clearWatchdog();
            setStatus('idle');
          }
          return;
        }

        // Sequence ID check: discard late results if configId does not match current sequence ID
        if (configId !== String(sequenceRef.current)) {
          return;
        }

        clearWatchdog();

        if ('retryWithImageData' in e.data && e.data.retryWithImageData) {
          hasWorkerOffscreenDegradationRef.current = true;
          const canvas = canvasRef.current;
          const context = canvas?.getContext('2d');
          if (!canvas || !context || canvas.width <= 0 || canvas.height <= 0) {
            isWorkerBusyRef.current = false;
            startTimeRef.current = null;
            setStatus('fail');
            return;
          }

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const payload = {
            imageData,
            width: imageData.width,
            height: imageData.height,
            isTest: !!navigator.webdriver,
            configId,
            moduleCount: pendingModuleCountRef.current,
          };
          assertWorkerRequest(payload);
          worker.postMessage(payload, [imageData.data.buffer]);
          watchdogRef.current = setTimeout(
            () => watchdogFallbackRef.current?.(),
            SCANNABILITY_WATCHDOG_MS
          );
          return;
        }

        if (!('success' in e.data)) return;
        const { success, physicalReady, error, localContrastViolations, minLocalContrast } = e.data;

        if (startTimeRef.current !== null) {
          lastLatencyRef.current = performance.now() - startTimeRef.current;
          startTimeRef.current = null;
        }
        isWorkerBusyRef.current = false;
        consecutiveTimeoutsRef.current = 0;

        if (localContrastViolations !== undefined) {
          setLocalMetrics({ violations: localContrastViolations, minContrast: minLocalContrast });
        }

        setStatus(success ? (physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');

        if (!success && error) {
          store.emitSignal('scannability-fail', {
            engine,
            styleId: configRef.current.style || 'default',
            errorType: error,
          });
        }

        // Successful message received means background worker is healthy
        setWorkerRecoveryActive(false);
      } catch (err) {
        console.error('Worker response validation failed:', err);
        setStatus('fail');
        store.emitSignal('scannability-fail', {
          engine,
          styleId: configRef.current.style || 'default',
          errorType: 'VALIDATION_ERROR',
        });
        startTimeRef.current = null;
        isWorkerBusyRef.current = false;
        clearWatchdog();
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [config, store, engine, getOrInitWorker, activeWorker, clearWatchdog, canvasRef]);

  // Handle worker cleanup on full unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      clearWatchdog();
      watchdogFallbackRef.current = null;
      isWorkerBusyRef.current = false;
      startTimeRef.current = null;
    };
  }, [clearWatchdog]);

  // Expose a function to trigger check
  const checkScannability = useCallback(
    (
      overrideImageData?: ImageData,
      overrideImageBitmap?: ImageBitmap,
      overrideModuleCount?: number
    ) => {
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
      const moduleCountToUse =
        overrideModuleCount && overrideModuleCount > 0
          ? overrideModuleCount
          : storeModuleCount && storeModuleCount > 0
            ? storeModuleCount
            : undefined;
      pendingModuleCountRef.current = moduleCountToUse;

      if (!worker) {
        // Worker failed or isn't supported, run on the main thread!
        const runMainThreadCheck = async () => {
          if (overrideImageBitmap) {
            try {
              if (currentSequence === String(sequenceRef.current)) {
                let imageData: ImageData | null = null;

                if (typeof OffscreenCanvas !== 'undefined') {
                  const canvas = new OffscreenCanvas(
                    overrideImageBitmap.width || 1,
                    overrideImageBitmap.height || 1
                  );
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
                    const { performScannabilityCheck } = await import('@/packages/scannability');
                    const isTest = !!navigator.webdriver;
                    const result = performScannabilityCheck(
                      imageData,
                      imageData.width,
                      imageData.height,
                      isTest
                    );
                    if (currentSequence === String(sequenceRef.current)) {
                      setStatus(
                        result.success
                          ? result.physicalReady
                            ? 'physical-pass'
                            : 'digital-pass'
                          : 'fail'
                      );
                      if (!result.success && result.error) {
                        store.emitSignal('scannability-fail', {
                          engine,
                          styleId: config.style || 'default',
                          errorType: result.error,
                        });
                      }
                    }
                  } catch (err) {
                    console.error('Main-thread fallback processing failed:', err);
                    if (currentSequence === String(sequenceRef.current)) {
                      setStatus('fail');
                      store.emitSignal('scannability-fail', {
                        engine,
                        styleId: config.style || 'default',
                        errorType: 'VALIDATION_ERROR',
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

          const { performScannabilityCheck } = await import('@/packages/scannability');
          const performValidation = (imgData: ImageData) => {
            try {
              const isTest = !!navigator.webdriver;
              const result = performScannabilityCheck(
                imgData,
                imgData.width,
                imgData.height,
                isTest,
                moduleCountToUse
              );
              if (currentSequence !== String(sequenceRef.current)) return;
              if (result.localContrastViolations !== undefined) {
                setLocalMetrics({
                  violations: result.localContrastViolations,
                  minContrast: result.minLocalContrast,
                });
              }
              setStatus(
                result.success
                  ? result.physicalReady
                    ? 'physical-pass'
                    : 'digital-pass'
                  : 'fail'
              );
              if (!result.success && result.error) {
                store.emitSignal('scannability-fail', {
                  engine,
                  styleId: config.style || 'default',
                  errorType: result.error,
                });
              }
            } catch (err) {
              console.error('Main-thread fallback processing failed:', err);
              if (currentSequence !== String(sequenceRef.current)) return;
              setStatus('fail');
              store.emitSignal('scannability-fail', {
                engine,
                styleId: config.style || 'default',
                errorType: 'VALIDATION_ERROR',
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
            console.error('Failed to read canvas data for fallback validation', err);
            setStatus('fail');
          }
        };

        scheduleIdleTask(runMainThreadCheck, 100);
        return;
      }

      // Set worker state as busy and start time
      isWorkerBusyRef.current = true;
      startTimeRef.current = performance.now();

      const startWatchdog = () => {
        clearWatchdog();
        const runFallback = async () => {
          if (currentSequence !== String(sequenceRef.current) || !isWorkerBusyRef.current) return;

          watchdogRef.current = null;
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          consecutiveTimeoutsRef.current += 1;
          setWorkerRecoveryActive(true);

          if (consecutiveTimeoutsRef.current > 1 && workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            setActiveWorker(null);
          }

          try {
            const { performScannabilityCheck } = await import('@/packages/scannability');
            let imageData = overrideImageData;
            if (!imageData && overrideImageBitmap) {
              try {
                if (typeof OffscreenCanvas !== 'undefined') {
                  const oc = new OffscreenCanvas(overrideImageBitmap.width || 1, overrideImageBitmap.height || 1);
                  const octx = oc.getContext('2d');
                  if (octx) {
                    octx.drawImage(overrideImageBitmap, 0, 0);
                    imageData = octx.getImageData(0, 0, oc.width, oc.height);
                  }
                } else if (typeof document !== 'undefined') {
                  const dc = document.createElement('canvas');
                  dc.width = overrideImageBitmap.width || 1;
                  dc.height = overrideImageBitmap.height || 1;
                  const dctx = dc.getContext('2d');
                  if (dctx) {
                    dctx.drawImage(overrideImageBitmap, 0, 0);
                    imageData = dctx.getImageData(0, 0, dc.width, dc.height);
                  }
                }
              } catch {}
            }
            if (!imageData) {
              const canvas = canvasRef.current;
              const context = canvas?.getContext('2d');
              if (canvas && context && canvas.width > 0 && canvas.height > 0) {
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              }
            }
            if (!imageData || currentSequence !== String(sequenceRef.current)) return;

            const result = performScannabilityCheck(
              imageData,
              imageData.width,
              imageData.height,
              !!navigator.webdriver,
              moduleCountToUse
            );
            if (currentSequence !== String(sequenceRef.current)) return;
            if (result.localContrastViolations !== undefined) {
              setLocalMetrics({
                violations: result.localContrastViolations,
                minContrast: result.minLocalContrast,
              });
            }
            setStatus(
              result.success
                ? result.physicalReady
                  ? 'physical-pass'
                  : 'digital-pass'
                : 'fail'
            );
          } catch (error) {
            console.error('Scannability worker watchdog fallback failed:', error);
            if (currentSequence === String(sequenceRef.current)) setStatus('fail');
          }
        };
        watchdogFallbackRef.current = () => void runFallback();
        watchdogRef.current = setTimeout(watchdogFallbackRef.current, SCANNABILITY_WATCHDOG_MS);
      };

      // Start watchdog immediately on checkScannability to catch canvas capture stalls
      startWatchdog();

      // If virtual renderer provided deterministic ImageBitmap, use it directly
      if (overrideImageBitmap) {
        if (currentSequence !== String(sequenceRef.current)) {
          releaseImageHandle(overrideImageBitmap);
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          clearWatchdog();
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
          console.error('Outgoing worker request validation failed:', err);
          setStatus('fail');
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          clearWatchdog();
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
          worker.postMessage(payload, [payload.imageData.data.buffer]);
        } catch (err) {
          console.error('Outgoing worker request validation failed:', err);
          setStatus('fail');
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          clearWatchdog();
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

        // Check if worker is degraded or createImageBitmap is not supported
        if (hasWorkerOffscreenDegradationRef.current || typeof globalThis.createImageBitmap !== 'function') {
          readAndSendFallback();
          return;
        }

        createImageBitmap(canvas)
          .then((imageBitmap) => {
            if (currentSequence !== String(sequenceRef.current)) {
              imageBitmap.close();
              isWorkerBusyRef.current = false;
              startTimeRef.current = null;
              clearWatchdog();
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
              console.error('Outgoing worker request validation failed:', err);
              setStatus('fail');
              isWorkerBusyRef.current = false;
              startTimeRef.current = null;
              clearWatchdog();
              imageBitmap.close();
            }
          })
          .catch((err) => {
            console.error('createImageBitmap failed, falling back to synchronous read:', err);
            readAndSendFallback();
          });
      };

      // Fallback synchronous canvas read with zero-copy buffer transfer
      const readAndSendFallback = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          setStatus('idle');
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          clearWatchdog();
          return;
        }
        try {
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setStatus('fail');
            isWorkerBusyRef.current = false;
            startTimeRef.current = null;
            clearWatchdog();
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
          worker.postMessage(payload, [imageData.data.buffer]);
        } catch (err) {
          console.error('Failed to read canvas data or validation failed', err);
          setStatus('fail');
          isWorkerBusyRef.current = false;
          startTimeRef.current = null;
          clearWatchdog();
        }
      };

      scheduleIdleTask(runCaptureAndSend, 100);
    },
    [canvasRef, getOrInitWorker, config, store, engine, clearWatchdog]
  );

  return { status, checkScannability, health, workerRecoveryActive };
}
