import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { isValidScannerResponse, getDownscaledDimensions } from '../utils/scannerContract';
import { getSharedScannerWorker, terminateSharedScannerWorker } from '../utils/sharedScannerWorker';
import { AdaptiveFrameScheduler } from '../utils/AdaptiveFrameScheduler';

/**
 * Options for configuring the useAdaptiveScanner hook.
 */
export interface UseAdaptiveScannerOptions {
  /**
   * React ref pointing to the HTMLVideoElement of the active camera stream.
   */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /**
   * Callback invoked when a QR code is successfully decoded from the stream.
   * @param data - The decoded text content of the QR code.
   */
  onScanSuccess?: (data: string) => void;
  /**
   * Callback invoked when a stream frame fails to decode or has an error.
   * @param error - The optional error message or type.
   */
  onScanFail?: (error?: string) => void;
  /**
   * The minimum sleep delay between frame capture executions in milliseconds.
   */
  minSamplingDelay?: number;
  /**
   * The maximum sleep delay between frame capture executions in milliseconds.
   */
  maxSamplingDelay?: number;
}

/**
 * Result object returned by the useAdaptiveScanner hook.
 */
export interface UseAdaptiveScannerResult {
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
   * React ref pointing to the shared persistent Web Worker instance.
   */
  workerRef?: React.MutableRefObject<Worker | null>;
}

/**
 * A custom React hook that coordinates off-thread web worker QR code decoding on camera stream frames,
 * tracking execution latency and implementing an adaptive backpressure-based sampling throttling loop.
 * @param root0
 * @param root0.videoRef
 * @param root0.onScanSuccess
 * @param root0.onScanFail
 * @param root0.minSamplingDelay
 * @param root0.maxSamplingDelay
 */
export function useAdaptiveScanner({
  videoRef,
  onScanSuccess,
  onScanFail,
  minSamplingDelay = 16,
  maxSamplingDelay = 1000,
}: UseAdaptiveScannerOptions): UseAdaptiveScannerResult {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const [samplingDelay, setSamplingDelay] = useState<number>(33); // Start at 33ms (~30 FPS)
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');

  // Internal tracking refs for metrics and status to bypass rendering cycles
  const internalStatusRef = useRef<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const samplingDelayRef = useRef<number>(33);
  const internalLatencyHistoryRef = useRef<number[]>([]);
  const isDirtyRef = useRef<boolean>(false);

  // Unified state update scheduler that batches/instantly flushes updates
  const updateScannerState = useCallback((updates: {
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
  }, [isTestEnv]);

  // Batch and flush interval effect to synchronize state with the UI
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
  const useMainThreadFallbackRef = useRef<boolean>(false);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleMessageRef = useRef<((e: MessageEvent) => void) | null>(null);
  const handleErrorRef = useRef<((err: any) => void) | null>(null);
  const handleMessageErrorRef = useRef<((err: any) => void) | null>(null);

  // Sync ref with option functions to avoid re-triggering effects on callbacks change
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailRef = useRef(onScanFail);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailRef.current = onScanFail;
  }, [onScanSuccess, onScanFail]);

  const schedulerRef = useRef<AdaptiveFrameScheduler | null>(null);

  const recreateWorker = useCallback(() => {
    // 1. Stability guardrail: activate main-thread fallback if auto-restart attempts exceed 3 consecutive retries
    consecutiveRestartAttemptsRef.current += 1;
    if (consecutiveRestartAttemptsRef.current > 3) {
      console.warn("Scanner background worker crashed repeatedly. Activating main-thread fallback.");
      useMainThreadFallbackRef.current = true;
      terminateSharedScannerWorker();
      workerRef.current = null;
      schedulerRef.current?.triggerRecovery(1500, false);
      return;
    }

    console.warn(`Watchdog: Recreating worker. Attempt ${consecutiveRestartAttemptsRef.current} of 3 consecutive retries.`);

    // 2. Terminate the active worker instance safely
    terminateSharedScannerWorker();
    workerRef.current = null;

    // 3. Clear/reset in-flight scheduler flags without triggering nested onWatchdogTriggered notifications
    schedulerRef.current?.triggerRecovery(1500, false);

    // 4. Create new worker
    if (typeof window === 'undefined') return;
    try {
      const worker = getSharedScannerWorker();
      workerRef.current = worker;

      // 5. Re-attach listeners via delegating wrappers
      const onMsg = (e: MessageEvent) => handleMessageRef.current?.(e);
      const onErr = (err: any) => handleErrorRef.current?.(err);
      const onMsgErr = (err: any) => handleMessageErrorRef.current?.(err);

      if (typeof worker.addEventListener === 'function') {
        worker.addEventListener('message', onMsg);
        worker.addEventListener('error', onErr);
        worker.addEventListener('messageerror', onMsgErr);
      } else {
        (worker as any).onmessage = onMsg;
        (worker as any).onerror = onErr;
      }
    } catch (err) {
      console.warn('Failed to recreate worker, activating main-thread fallback:', err);
      useMainThreadFallbackRef.current = true;
      workerRef.current = null;
    }
  }, []);

  // Instantiate the decoupled AdaptiveFrameScheduler lazily inside callback helper to avoid useRef render access
  const getScheduler = useCallback(() => {
    if (schedulerRef.current === null) {
      schedulerRef.current = new AdaptiveFrameScheduler({
        minSamplingDelay,
        maxSamplingDelay,
        onStatusChange: (status) => updateScannerState({ status }),
        onDelayChange: (delay) => updateScannerState({ samplingDelay: delay }),
        onLatencyHistoryChange: (history) => updateScannerState({ latencyHistory: history }),
        onScanSuccess: (data) => {
          if (onScanSuccessRef.current) {
            onScanSuccessRef.current(data);
          }
        },
        onScanFail: (error) => {
          if (onScanFailRef.current) {
            onScanFailRef.current(error);
          }
        },
        onWatchdogTriggered: (_elapsed) => {
          recreateWorker();
        },
      });
    }
    return schedulerRef.current;
  }, [minSamplingDelay, maxSamplingDelay, updateScannerState, recreateWorker]);

  const handleMessage = useCallback((e: MessageEvent) => {
    const payload = e.data;

    // Schema validation
    if (!isValidScannerResponse(payload)) {
      console.error('Invalid scanner response payload:', payload);
      return;
    }

    // Reset consecutive restart attempts on a successful frame process/response
    consecutiveRestartAttemptsRef.current = 0;

    const { status: resultStatus, sequenceId, decodedData, error, buffer } = payload;

    getScheduler().endFrame(sequenceId, resultStatus, decodedData, error, buffer);
  }, [getScheduler]);

  const handleError = useCallback((err: any) => {
    console.error('Worker thread-level runtime boundary error:', err);
    recreateWorker();
  }, [recreateWorker]);

  const handleMessageError = useCallback((err: any) => {
    console.error('Worker thread-level message data transfer error:', err);
    recreateWorker();
  }, [recreateWorker]);

  // Update refs to point to the latest callback versions in an effect
  useEffect(() => {
    handleMessageRef.current = handleMessage;
    handleErrorRef.current = handleError;
    handleMessageErrorRef.current = handleMessageError;
  }, [handleMessage, handleError, handleMessageError]);

  // Handle worker initialization and communication lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMsg = (e: MessageEvent) => handleMessageRef.current?.(e);
    const onErr = (err: any) => handleErrorRef.current?.(err);
    const onMsgErr = (err: any) => handleMessageErrorRef.current?.(err);

    try {
      const worker = getSharedScannerWorker();
      workerRef.current = worker;

      if (typeof worker.addEventListener === 'function') {
        worker.addEventListener('message', onMsg);
        worker.addEventListener('error', onErr);
        worker.addEventListener('messageerror', onMsgErr);
      } else {
        (worker as any).onmessage = onMsg;
        (worker as any).onerror = onErr;
      }
    } catch (err) {
      console.warn('Failed to initialize background scanner worker, activating main-thread fallback:', err);
      useMainThreadFallbackRef.current = true;
      workerRef.current = null;
    }

    return () => {
      const activeWorker = workerRef.current;
      if (activeWorker) {
        if (typeof activeWorker.removeEventListener === 'function') {
          activeWorker.removeEventListener('message', onMsg);
          activeWorker.removeEventListener('error', onErr);
          activeWorker.removeEventListener('messageerror', onMsgErr);
        } else {
          (activeWorker as any).onmessage = null;
          (activeWorker as any).onerror = null;
        }
      }
      terminateSharedScannerWorker();
      workerRef.current = null;
    };
  }, []);

  const captureFrame = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video) return false;
    const scheduler = getScheduler();
    if (!scheduler) return false;

    // Strict backpressure lock checked directly at capture trigger
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

      // Capture video frame as non-blocking image bitmap resource on the main thread
      createImageBitmap(video, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'low',
      }).then((image) => {
        if (!workerRef.current) {
          useMainThreadFallbackRef.current = true;
          scheduler.endFrame(seqId, 'fail', null, 'WORKER_UNAVAILABLE');
          return;
        }
        // Transfer captured image resource directly to the background Web Worker
        workerRef.current.postMessage(
          {
            image,
            width,
            height,
            sequenceId: seqId,
          },
          [image]
        );
      }).catch((err) => {
        console.error('Failed to capture or dispatch camera frame:', err);
        scheduler.endFrame(seqId, 'fail', null, 'CAPTURE_ERROR');
      });
      return true;
    } catch (err) {
      console.error('Failed to capture or dispatch camera frame:', err);
      return false;
    }
  }, [videoRef, getScheduler]);

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

  const attachVideoListeners = useCallback((video: HTMLVideoElement, triggerPlay: () => void) => {
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
  }, [captureFrame, detachVideoListeners]);

  // Frame Capture and Dispatch Loop
  useEffect(() => {
    if (!isScanning) {
      updateScannerState({ status: 'idle' });
      // Immediately flush state updates when scanning stops
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
        const video = videoRef.current;
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
            // Capture the initial/current frame immediately on pause/load
            captureFrame(true);
            isLoopRunning = false;
            return;
          }
        } else {
          // Webcam isolation: detach listeners from non-file videos
          detachVideoListeners();

          // Live camera respects paused loop guard
          if (video.paused || video.ended) {
            isLoopRunning = true;
            timerId = setTimeout(() => {
              rafId = requestAnimationFrame(runLoop);
            }, samplingDelayRef.current);
            return;
          }
        }

        // Apply strict Backpressure Lock and Starvation Watchdog
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

        // Wrap actual pixel acquisition in idle browser periods to keep rendering thread extremely responsive
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

    // Begin the adaptive capture loop
    isLoopRunning = true;
    rafId = requestAnimationFrame(runLoop);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (rafId) cancelAnimationFrame(rafId);
      detachVideoListeners();
    };
  }, [isScanning, videoRef, captureFrame, attachVideoListeners, detachVideoListeners, isTestEnv, updateScannerState, getScheduler]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    consecutiveRestartAttemptsRef.current = 0;
    getScheduler().start();
  }, [getScheduler]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    consecutiveRestartAttemptsRef.current = 0;
    getScheduler().stop();
  }, [getScheduler]);

  return {
    isScanning,
    status,
    samplingDelay,
    latencyHistory,
    startScanning,
    stopScanning,
    workerRef,
  };
}
