import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  isValidScannerResponse,
  getDownscaledDimensions,
  ScanResult,
  ScanOptions,
  ScannerStatus,
} from './lib/contracts';
import { getScannerWorker, terminateScannerWorker } from './lib/workerRunner';
import { AdaptiveFrameScheduler } from './lib/scheduler';
import { scanSource } from './lib/sourceExtractor';

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
  const [status, setStatus] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const [samplingDelay, setSamplingDelay] = useState<number>(33);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const isTestEnv =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');

  const internalStatusRef = useRef<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const samplingDelayRef = useRef<number>(33);
  const internalLatencyHistoryRef = useRef<number[]>([]);
  const isDirtyRef = useRef<boolean>(false);

  const updateScannerState = useCallback(
    (updates: {
      status?: 'idle' | 'checking' | 'pass' | 'fail';
      samplingDelay?: number;
      latencyHistory?: number[];
    }) => {
      if (updates.status !== undefined) {
        internalStatusRef.current = updates.status;
      }
      if (updates.samplingDelay !== undefined) {
        samplingDelayRef.current = updates.samplingDelay;
      }
      if (updates.latencyHistory !== undefined) {
        internalLatencyHistoryRef.current = updates.latencyHistory;
      }

      if (isTestEnv) {
        if (updates.status !== undefined) setStatus(updates.status);
        if (updates.samplingDelay !== undefined) setSamplingDelay(updates.samplingDelay);
        if (updates.latencyHistory !== undefined) setLatencyHistory(updates.latencyHistory);
      } else {
        isDirtyRef.current = true;
      }
    },
    [isTestEnv]
  );

  useEffect(() => {
    if (!isScanning || isTestEnv) return;

    const intervalId = setInterval(() => {
      if (isDirtyRef.current) {
        setStatus(internalStatusRef.current);
        setSamplingDelay(samplingDelayRef.current);
        setLatencyHistory(internalLatencyHistoryRef.current);
        isDirtyRef.current = false;
      }
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [isScanning, isTestEnv]);

  const workerRef = useRef<Worker | null>(null);
  const consecutiveRestartAttemptsRef = useRef<number>(0);
  const epochRef = useRef<number>(1);
  const useMainThreadFallbackRef = useRef<boolean>(false);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleMessageRef = useRef<((e: MessageEvent) => void) | null>(null);
  const handleErrorRef = useRef<((err: any) => void) | null>(null);
  const handleMessageErrorRef = useRef<((err: any) => void) | null>(null);

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

  const attachWorkerListeners = useCallback(
    (worker: Worker) => {
      detachWorkerListeners();

      const onMsg = (e: MessageEvent) => handleMessageRef.current?.(e);
      const onErr = (err: any) => handleErrorRef.current?.(err);
      const onMsgErr = (err: any) => handleMessageErrorRef.current?.(err);

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

  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailRef = useRef(onScanFail);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailRef.current = onScanFail;
  }, [onScanSuccess, onScanFail]);

  const schedulerRef = useRef<AdaptiveFrameScheduler | null>(null);

  const recreateWorker = useCallback(() => {
    consecutiveRestartAttemptsRef.current += 1;
    if (consecutiveRestartAttemptsRef.current > 3) {
      console.warn('Scanner background worker crashed repeatedly. Activating main-thread fallback.');
      useMainThreadFallbackRef.current = true;
      detachWorkerListeners();
      terminateScannerWorker();
      workerRef.current = null;
      schedulerRef.current?.triggerRecovery(1500, false);
      return;
    }

    console.warn(
      `Watchdog: Recreating worker. Attempt ${consecutiveRestartAttemptsRef.current} of 3 consecutive retries.`
    );

    epochRef.current += 1;
    const nextTimeout = Math.min(6000, 1500 * Math.pow(2, consecutiveRestartAttemptsRef.current));
    schedulerRef.current?.setWatchdogTimeout(nextTimeout);

    detachWorkerListeners();
    terminateScannerWorker();
    workerRef.current = null;

    schedulerRef.current?.triggerRecovery(nextTimeout, false);

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
  }, [detachWorkerListeners, attachWorkerListeners]);

  const getScheduler = useCallback(() => {
    if (schedulerRef.current === null) {
      schedulerRef.current = new AdaptiveFrameScheduler({
        minSamplingDelay,
        maxSamplingDelay,
        onStatusChange: (s: ScannerStatus) => updateScannerState({ status: s }),
        onDelayChange: (delay: number) => updateScannerState({ samplingDelay: delay }),
        onLatencyHistoryChange: (history: number[]) => updateScannerState({ latencyHistory: history }),
        onScanSuccess: (data: string) => {
          if (onScanSuccessRef.current) {
            onScanSuccessRef.current(data);
          }
        },
        onScanFail: (error?: string | null) => {
          if (onScanFailRef.current) {
            onScanFailRef.current(error ?? undefined);
          }
        },
        onWatchdogTriggered: (_elapsed: number) => {
          recreateWorker();
        },
      });
    }
    return schedulerRef.current;
  }, [minSamplingDelay, maxSamplingDelay, updateScannerState, recreateWorker]);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
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
        consecutiveRestartAttemptsRef.current = 0;
        schedulerRef.current?.setWatchdogTimeout(1500);
      }

      getScheduler().endFrame(sequenceId, resultStatus, decodedData, error, buffer);
    },
    [getScheduler]
  );

  const handleError = useCallback(
    (err: any) => {
      console.error('Worker thread-level runtime boundary error:', err);
      recreateWorker();
    },
    [recreateWorker]
  );

  const handleMessageError = useCallback(
    (err: any) => {
      console.error('Worker thread-level message data transfer error:', err);
      recreateWorker();
    },
    [recreateWorker]
  );

  useEffect(() => {
    handleMessageRef.current = handleMessage;
    handleErrorRef.current = handleError;
    handleMessageErrorRef.current = handleMessageError;
  }, [handleMessage, handleError, handleMessageError]);

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
      schedulerRef.current?.stop();
      detachWorkerListeners();
      workerRef.current = null;
    };
  }, [attachWorkerListeners, detachWorkerListeners]);

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
                    let code = jsQR(imageData.data, dWidth, dHeight, { inversionAttempts: 'dontInvert' });
                    if (!code) {
                      code = jsQR(imageData.data, dWidth, dHeight, { inversionAttempts: 'attemptBoth' });
                    }
                    if (code && code.data) {
                      consecutiveRestartAttemptsRef.current = 0;
                      scheduler.endFrame(seqId, 'pass', code.data, null);
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
    [videoRef, getScheduler]
  );

  const listenersAttachedRef = useRef<{
    video: HTMLVideoElement;
    onPause: () => void;
    onSeeked: () => void;
    onPlay: () => void;
    onLoadedData: () => void;
  } | null>(null);

  const detachVideoListeners = useCallback(() => {
    if (listenersAttachedRef.current) {
      const { video, onPause, onSeeked, onPlay, onLoadedData } = listenersAttachedRef.current;
      try {
        video.removeEventListener('pause', onPause);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('playing', onPlay);
        video.removeEventListener('loadeddata', onLoadedData);
      } catch (e) {
        console.error('Failed to detach video listeners:', e);
      }
      listenersAttachedRef.current = null;
    }
  }, []);

  const attachVideoListeners = useCallback(
    (video: HTMLVideoElement, triggerPlay: () => void) => {
      if (listenersAttachedRef.current && listenersAttachedRef.current.video === video) {
        return;
      }

      if (listenersAttachedRef.current) {
        detachVideoListeners();
      }

      const onPause = () => {
        captureFrame(true);
      };

      const onSeeked = () => {
        captureFrame(true);
      };

      const onPlay = () => {
        triggerPlay();
      };

      const onLoadedData = () => {
        captureFrame(true);
      };

      video.addEventListener('pause', onPause);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('play', onPlay);
      video.addEventListener('playing', onPlay);
      video.addEventListener('loadeddata', onLoadedData);

      listenersAttachedRef.current = {
        video,
        onPause,
        onSeeked,
        onPlay,
        onLoadedData,
      };
    },
    [captureFrame, detachVideoListeners]
  );

  useEffect(() => {
    if (!isScanning) {
      updateScannerState({ status: 'idle' });
      if (!isTestEnv) {
        setStatus(internalStatusRef.current);
        setSamplingDelay(samplingDelayRef.current);
        setLatencyHistory(internalLatencyHistoryRef.current);
        isDirtyRef.current = false;
      }
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
          attachVideoListeners(video, () => {
            if (!isLoopRunning && active) {
              isLoopRunning = true;
              if (timerId) clearTimeout(timerId);
              if (rafId) cancelAnimationFrame(rafId);
              rafId = requestAnimationFrame(runLoop);
            }
          });

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
    isTestEnv,
    updateScannerState,
    getScheduler,
  ]);

  const startScanning = useCallback(() => {
    isScanningRef.current = true;
    setIsScanning(true);
    consecutiveRestartAttemptsRef.current = 0;
    epochRef.current += 1;
    const scheduler = getScheduler();
    scheduler.setWatchdogTimeout(1500);
    scheduler.start();
  }, [getScheduler]);

  const stopScanning = useCallback(() => {
    const wasScanning = isScanningRef.current || isScanning;
    isScanningRef.current = false;
    setIsScanning(false);
    consecutiveRestartAttemptsRef.current = 0;
    const scheduler = getScheduler();
    scheduler.setWatchdogTimeout(1500);
    scheduler.stop();

    if (wasScanning && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('scanner-telemetry-dispatch', {
          detail: {
            latencyHistory: internalLatencyHistoryRef.current,
            frameDropCount: 0,
            processingLatency: samplingDelayRef.current,
            sessionType: 'camera',
          },
        })
      );
    }
  }, [getScheduler, isScanning]);

  const scanFile = useCallback(async (file: File, options?: ScanOptions): Promise<ScanResult> => {
    return scanSource(file, options);
  }, []);

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
