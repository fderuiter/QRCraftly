import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isValidScannerResponse,
  getDownscaledDimensions,
  ScanResult,
  ScanOptions,
  ScannerStatus,
} from './lib/contracts';
import { AdaptiveFrameScheduler } from './lib/scheduler';
import { scanSource } from './lib/sourceExtractor';
import { decodeImageDataSync } from './lib/decodeSync';
import { useBatchScannerState } from './lib/useBatchScannerState';
import { useWorkerRecovery } from './lib/useWorkerRecovery';
import { useVideoBinding } from './lib/useVideoBinding';

/**
 * Configuration options for the useQrScanner hook.
 */
export interface UseQrScannerOptions {
  /**
   * React ref pointing to the HTMLVideoElement of the active camera stream.
   */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /**
   * Callback invoked when a QR code is successfully decoded from the stream.
   */
  onScanSuccess?: (data: string) => void;
  /**
   * Callback invoked when a stream frame fails to decode or has an error.
   */
  onScanFail?: (error?: string) => void;
  /**
   * Minimum sleep delay between frame capture executions in milliseconds.
   */
  minSamplingDelay?: number;
  /**
   * Maximum sleep delay between frame capture executions in milliseconds.
   */
  maxSamplingDelay?: number;
}

/**
 * Result object returned by the useQrScanner hook.
 */
export interface UseQrScannerResult {
  /**
   * Whether the background frame-sampling loop is currently active.
   */
  isScanning: boolean;
  /**
   * The current status of the scannability check.
   */
  status: 'idle' | 'checking' | 'pass' | 'fail';
  /**
   * The current dynamic sampling sleep delay in milliseconds.
   */
  samplingDelay: number;
  /**
   * An array containing the last three round-trip execution durations of the worker check cycles.
   */
  latencyHistory: number[];
  /**
   * Starts the camera frame capture scheduler loop.
   */
  startScanning: () => void;
  /**
   * Stops the camera frame capture scheduler loop.
   */
  stopScanning: () => void;
  /**
   * Unified file scanning method (processes images, WebM, and MKV video files).
   */
  scanFile: (file: File, options?: ScanOptions) => Promise<ScanResult>;
  /**
   * React ref pointing to the shared Web Worker instance.
   */
  workerRef?: React.MutableRefObject<Worker | null>;
}

/**
 * A custom React hook that coordinates off-thread Web Worker QR code decoding on camera stream frames,
 * tracking execution latency, implementing an adaptive backpressure-based sampling throttling loop,
 * and providing a unified file scanning entry point.
 */
export function useQrScanner({
  videoRef,
  onScanSuccess,
  onScanFail,
  minSamplingDelay = 16,
  maxSamplingDelay = 1000,
}: UseQrScannerOptions = {}): UseQrScannerResult {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const isScanningRef = useRef<boolean>(false);

  const {
    status,
    samplingDelay,
    latencyHistory,
    samplingDelayRef,
    latencyHistoryRef,
    updateState,
    resetState,
  } = useBatchScannerState(isScanning);

  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailRef = useRef(onScanFail);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailRef.current = onScanFail;
  }, [onScanSuccess, onScanFail]);

  const recreateWorkerRef = useRef<() => void>(() => {});
  const resetRestartCounterRef = useRef<() => void>(() => {});

  const handleWorkerMessageRef = useRef<(e: MessageEvent) => void>(() => {});
  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    handleWorkerMessageRef.current(e);
  }, []);

  const schedulerRef = useRef<AdaptiveFrameScheduler | null>(null);

  const getScheduler = useCallback(() => {
    if (schedulerRef.current === null) {
      schedulerRef.current = new AdaptiveFrameScheduler({
        minSamplingDelay,
        maxSamplingDelay,
        onStatusChange: (s: ScannerStatus) => updateState({ status: s }),
        onDelayChange: (delay: number) => updateState({ samplingDelay: delay }),
        onLatencyHistoryChange: (history: number[]) => updateState({ latencyHistory: history }),
        onScanSuccess: (data: string) => {
          onScanSuccessRef.current?.(data);
        },
        onScanFail: (error?: string | null) => {
          onScanFailRef.current?.(error ?? undefined);
        },
        onWatchdogTriggered: (_elapsed: number) => {
          recreateWorkerRef.current();
        },
      });
    }
    return schedulerRef.current;
  }, [minSamplingDelay, maxSamplingDelay, updateState]);

  const {
    workerRef,
    epochRef,
    useMainThreadFallbackRef,
    recreateWorker,
    resetRestartCounter,
    detachWorkerListeners,
  } = useWorkerRecovery({
    onMessage: handleWorkerMessage,
    getScheduler,
  });

  useEffect(() => {
    recreateWorkerRef.current = recreateWorker;
    resetRestartCounterRef.current = resetRestartCounter;
  }, [recreateWorker, resetRestartCounter]);

  useEffect(() => {
    handleWorkerMessageRef.current = (e: MessageEvent) => {
      const payload = e.data;

      if (!isValidScannerResponse(payload)) {
        console.error('Invalid scanner response payload:', payload);
        return;
      }

      if (payload.epochId !== undefined && payload.epochId !== epochRef.current) {
        console.warn(
          `Discarding stale message from outdated epoch: ${payload.epochId} (current: ${epochRef.current})`
        );
        return;
      }

      const { status: resultStatus, sequenceId, decodedData, error, buffer } = payload;

      if (resultStatus === 'pass' || error !== 'STALE_FRAME') {
        resetRestartCounterRef.current();
        schedulerRef.current?.setWatchdogTimeout(1500);
      }

      getScheduler().endFrame(sequenceId, resultStatus, decodedData, error, buffer);
    };
  }, [epochRef, getScheduler]);

  const { attachVideoListeners, detachVideoListeners } = useVideoBinding();

  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const captureFrame = useCallback(
    (force = false) => {
      const video = videoRef?.current;
      if (!video) return false;
      const scheduler = getScheduler();
      if (!scheduler) return false;

      if (!force && scheduler.getInFlight()) {
        return false;
      }

      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;
        if (width === 0 || height === 0) {
          return false;
        }

        const seqId = scheduler.beginFrame(force);
        if (seqId === null) {
          return false;
        }

        if (useMainThreadFallbackRef.current || !workerRef.current) {
          if (!fallbackCanvasRef.current && typeof document !== 'undefined') {
            fallbackCanvasRef.current = document.createElement('canvas');
          }
          const canvas = fallbackCanvasRef.current;
          const { width: dWidth, height: dHeight } = getDownscaledDimensions(width, height, 800);

          if (canvas) {
            if (canvas.width !== dWidth || canvas.height !== dHeight) {
              canvas.width = dWidth;
              canvas.height = dHeight;
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
              try {
                ctx.drawImage(video, 0, 0, dWidth, dHeight);
                const imageData = ctx.getImageData(0, 0, dWidth, dHeight);

                const performMainThreadDecode = () => {
                  try {
                    const decoded = decodeImageDataSync(imageData, dWidth, dHeight);
                    if (decoded) {
                      resetRestartCounter();
                      scheduler.endFrame(seqId, 'pass', decoded, null);
                    } else {
                      scheduler.endFrame(seqId, 'fail', null, null);
                    }
                  } catch (decodeErr: any) {
                    console.error('Main-thread QR decoding error:', decodeErr);
                    scheduler.endFrame(seqId, 'fail', null, decodeErr?.message || 'DECODE_ERROR');
                  }
                };

                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                  (window as any).requestIdleCallback(performMainThreadDecode, { timeout: 50 });
                } else {
                  setTimeout(performMainThreadDecode, 0);
                }
              } catch (drawErr) {
                console.error('Failed to draw or read canvas during main-thread decode:', drawErr);
                scheduler.endFrame(seqId, 'fail', null, 'CANVAS_READ_ERROR');
              }
            } else {
              scheduler.endFrame(seqId, 'fail', null, 'CANVAS_CONTEXT_ERROR');
            }
          } else {
            scheduler.endFrame(seqId, 'fail', null, 'CANVAS_UNAVAILABLE');
          }
          return true;
        }

        const maxDim = Math.max(width, height);
        if (maxDim > 1280) {
          const scale = 1280 / maxDim;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        createImageBitmap(video, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: 'low',
        })
          .then((image) => {
            if (!workerRef.current) {
              useMainThreadFallbackRef.current = true;
              scheduler.endFrame(seqId, 'fail', null, 'WORKER_UNAVAILABLE');
              return;
            }
            workerRef.current.postMessage(
              {
                image,
                width,
                height,
                sequenceId: seqId,
                epochId: epochRef.current,
              },
              [image]
            );
          })
          .catch((err) => {
            console.error('Failed to capture or dispatch camera frame:', err);
            scheduler.endFrame(seqId, 'fail', null, 'CAPTURE_ERROR');
          });
        return true;
      } catch (err) {
        console.error('Failed to capture or dispatch camera frame:', err);
        return false;
      }
    },
    [videoRef, getScheduler, resetRestartCounter, useMainThreadFallbackRef, workerRef, epochRef]
  );

  useEffect(() => {
    if (!isScanning) {
      resetState();
      return;
    }

    let active = true;
    let timerId: any = null;
    let rafId: any = null;
    let isLoopRunning = false;

    const runLoop = () => {
      if (!active) return;

      const performCapture = () => {
        const video = videoRef?.current;
        if (!video) {
          isLoopRunning = false;
          timerId = setTimeout(() => {
            rafId = requestAnimationFrame(runLoop);
          }, samplingDelayRef.current);
          return;
        }

        const isVideoFile = !video.srcObject && (!!video.src || !!video.currentSrc);

        if (isVideoFile) {
          attachVideoListeners(
            video,
            () => {
              if (!isLoopRunning && active) {
                isLoopRunning = true;
                if (timerId) clearTimeout(timerId);
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(runLoop);
              }
            },
            captureFrame
          );

          if (video.paused || video.ended) {
            captureFrame(true);
            isLoopRunning = false;
            return;
          }
        } else {
          detachVideoListeners();

          if (video.paused || video.ended) {
            isLoopRunning = true;
            timerId = setTimeout(() => {
              rafId = requestAnimationFrame(runLoop);
            }, samplingDelayRef.current);
            return;
          }
        }

        const scheduler = getScheduler();
        if (scheduler?.getInFlight()) {
          scheduler.checkWatchdog();
          if (scheduler.getInFlight()) {
            isLoopRunning = true;
            timerId = setTimeout(() => {
              rafId = requestAnimationFrame(runLoop);
            }, samplingDelayRef.current);
            return;
          }
        }

        const acquireAndDispatch = () => {
          if (!active) return;

          captureFrame();

          isLoopRunning = true;
          timerId = setTimeout(() => {
            rafId = requestAnimationFrame(runLoop);
          }, samplingDelayRef.current);
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(acquireAndDispatch, { timeout: 50 });
        } else {
          acquireAndDispatch();
        }
      };

      performCapture();
    };

    isLoopRunning = true;
    rafId = requestAnimationFrame(runLoop);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (rafId) cancelAnimationFrame(rafId);
      detachVideoListeners();
    };
  }, [
    isScanning,
    videoRef,
    captureFrame,
    attachVideoListeners,
    detachVideoListeners,
    getScheduler,
  ]);

  const startScanning = useCallback(() => {
    isScanningRef.current = true;
    setIsScanning(true);
    resetRestartCounter();
    epochRef.current += 1;
    const scheduler = getScheduler();
    scheduler.setWatchdogTimeout(1500);
    scheduler.start();
  }, [getScheduler, resetRestartCounter]);

  const stopScanning = useCallback(() => {
    const wasScanning = isScanningRef.current || isScanning;
    isScanningRef.current = false;
    setIsScanning(false);
    resetRestartCounter();
    resetState();
    const scheduler = getScheduler();
    scheduler.setWatchdogTimeout(1500);
    scheduler.stop();

    if (wasScanning && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('scanner-telemetry-dispatch', {
          detail: {
            latencyHistory: latencyHistoryRef.current,
            frameDropCount: 0,
            processingLatency: samplingDelayRef.current,
            sessionType: 'camera',
          },
        })
      );
    }
  }, [getScheduler, isScanning, resetRestartCounter, resetState, latencyHistoryRef, samplingDelayRef]);

  const scanFile = useCallback(async (file: File, options?: ScanOptions): Promise<ScanResult> => {
    return scanSource(file, options);
  }, []);

  useEffect(() => {
    return () => {
      schedulerRef.current?.stop();
      detachWorkerListeners();
    };
  }, [detachWorkerListeners]);

  return {
    isScanning,
    status,
    samplingDelay,
    latencyHistory,
    startScanning,
    stopScanning,
    scanFile,
    workerRef,
  };
}
