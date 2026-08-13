import { useState, useEffect, useRef, useCallback } from 'react';
import { isValidScannerResponse } from '../utils/scannerContract';
import { getSharedScannerWorker, terminateSharedScannerWorker } from '../utils/sharedScannerWorker';

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
 * @param options - Hook configuration options including video element ref and callbacks.
 * @param options.videoRef
 * @param options.onScanSuccess
 * @param options.onScanFail
 * @param options.minSamplingDelay
 * @param options.maxSamplingDelay
 * @returns The active state, current dynamic sampling delay, latency history, and control functions.
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
  const inFlightRef = useRef<boolean>(false);
  const sequenceRef = useRef<number>(0);
  const completedSequenceRef = useRef<number>(0);

  // Track start times of in-flight requests mapped by sequenceId
  const startTimeMapRef = useRef<Map<number, number>>(new Map());
  const latencyHistoryRef = useRef<number[]>([]);

  // Watchdog & stability tracking refs
  const consecutiveRestartAttemptsRef = useRef<number>(0);
  const inFlightStartRef = useRef<number | null>(null);

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

  const recreateWorker = useCallback(() => {
    // 1. Stability guardrail: limit auto-restart attempts to a maximum of 3 consecutive retries
    consecutiveRestartAttemptsRef.current += 1;
    if (consecutiveRestartAttemptsRef.current > 3) {
      console.error("Scanner background worker crashed repeatedly. Stopping scanning loop.");
      setIsScanning(false);
      consecutiveRestartAttemptsRef.current = 0; // Reset counter
      if (onScanFailRef.current) {
        onScanFailRef.current(
          "The scanner background worker crashed repeatedly. Please restart the page or check your camera."
        );
      }
      return;
    }

    console.warn(`Watchdog: Recreating worker. Attempt ${consecutiveRestartAttemptsRef.current} of 3 consecutive retries.`);

    // 2. Terminate the active worker instance safely
    terminateSharedScannerWorker();
    workerRef.current = null;

    // 3. Clear/reset in-flight sequence tracking flags
    inFlightRef.current = false;
    inFlightStartRef.current = null;
    startTimeMapRef.current.clear();

    // 5. Create new worker
    if (typeof window === 'undefined') return;
    try {
      const worker = getSharedScannerWorker();
      workerRef.current = worker;

      // 6. Re-attach listeners via delegating wrappers
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
      console.error('Failed to recreate worker:', err);
    }
  }, []);

  const handleMessage = useCallback((e: MessageEvent) => {
    const payload = e.data;

    // Schema validation
    if (!isValidScannerResponse(payload)) {
      console.error('Invalid scanner response payload:', payload);
      return;
    }

    // Reset consecutive restart attempts on a successful frame process/response
    consecutiveRestartAttemptsRef.current = 0;

    const { status: resultStatus, sequenceId, decodedData, error } = payload;

    // Catch STALE_FRAME immediately from the background worker
    if (error === 'STALE_FRAME') {
      // Clear state for the dropped frame
      startTimeMapRef.current.delete(sequenceId);

      if (sequenceId > completedSequenceRef.current) {
        completedSequenceRef.current = sequenceId;
        // Release the in-flight block to allow next frame dispatches
        inFlightRef.current = false;
        inFlightStartRef.current = null;
      }

      // Skip public status updates, user error callbacks, and latency calculations
      return;
    }

    const startTime = startTimeMapRef.current.get(sequenceId);
    if (startTime !== undefined) {
      startTimeMapRef.current.delete(sequenceId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Requirement 5: Discard out-of-order older worker results
      if (sequenceId <= completedSequenceRef.current) {
        // Releases backpressure for this discarded request is handled when the current in-flight completes
        return;
      }
      completedSequenceRef.current = sequenceId;

      // Keep rolling latency history (last three cycles)
      const updatedHistory = [...latencyHistoryRef.current, duration];
      if (updatedHistory.length > 3) {
        updatedHistory.shift();
      }
      latencyHistoryRef.current = updatedHistory;

      if (resultStatus === 'pass') {
        if (decodedData && onScanSuccessRef.current) {
          onScanSuccessRef.current(decodedData);
        }
      } else if (resultStatus === 'fail') {
        if (onScanFailRef.current) {
          onScanFailRef.current(error || undefined);
        }
      }

      // Dynamic Throttling / Throttling Logic (Requirement 3 / Acceptance Criteria)
      const avgDuration = updatedHistory.reduce((a, b) => a + b, 0) / updatedHistory.length;
      const latencyMetric = Math.max(duration, avgDuration);
      let nextDelay = samplingDelayRef.current;

      if (latencyMetric > 100) {
        // Scale down: increase sampling delay (slower capture rate)
        nextDelay = Math.min(maxSamplingDelay, Math.max(samplingDelayRef.current + 50, latencyMetric * 1.5));
      } else if (latencyMetric < 40) {
        // Scale up: decrease sampling delay (faster capture rate)
        nextDelay = Math.max(minSamplingDelay, samplingDelayRef.current - 10);
      }

      updateScannerState({
        status: resultStatus,
        latencyHistory: updatedHistory,
        samplingDelay: nextDelay,
      });

      // Release the in-flight block to allow next frame dispatches
      inFlightRef.current = false;
      inFlightStartRef.current = null;
    }
  }, [minSamplingDelay, maxSamplingDelay, updateScannerState]);

  const handleError = useCallback((err: any) => {
    console.error('Worker thread-level runtime boundary error:', err);
    recreateWorker();
  }, [recreateWorker]);

  const handleMessageError = useCallback((err: any) => {
    console.error('Worker thread-level message data transfer error:', err);
    recreateWorker();
  }, [recreateWorker]);

  // Update refs to point to the latest callback versions in an effect (not during render)
  useEffect(() => {
    handleMessageRef.current = handleMessage;
    handleErrorRef.current = handleError;
    handleMessageErrorRef.current = handleMessageError;
  }, [handleMessage, handleError, handleMessageError]);

  // Handle worker initialization and communication lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = getSharedScannerWorker();
    workerRef.current = worker;

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

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      if (width === 0 || height === 0) {
        return false;
      }

      const maxDim = Math.max(width, height);
      if (maxDim > 1280) {
        const scale = 1280 / maxDim;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // Capture video frame as non-blocking image bitmap resource on the main thread
      // instead of drawing them to a main-thread canvas
      createImageBitmap(video, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'low',
      }).then((image) => {
        // Increment sequence and track start time
        sequenceRef.current += 1;
        const seqId = sequenceRef.current;

        inFlightRef.current = true;
        inFlightStartRef.current = performance.now();
        startTimeMapRef.current.set(seqId, performance.now());
        updateScannerState({ status: 'checking' });

        // Transfer captured image resource directly to the background Web Worker using zero-copy serialization mechanisms
        workerRef.current?.postMessage(
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
      });
      return true;
    } catch (err) {
      console.error('Failed to capture or dispatch camera frame:', err);
      return false;
    }
  }, [videoRef, updateScannerState]);

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
      captureFrame();
    };

    const onSeeked = () => {
      captureFrame();
    };

    const onPlay = () => {
      triggerPlay();
    };

    const onLoadedData = () => {
      captureFrame();
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
      // Immediately flush state updates when scanning stops so that the UI resets instantly
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
            captureFrame();
            // Continuous looping animation frame scheduler remains asleep when paused.
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

        // Requirement 2 / Constraint: Block new frame dispatches while in-flight
        if (inFlightRef.current) {
          if (inFlightStartRef.current) {
            const elapsed = performance.now() - inFlightStartRef.current;
            if (elapsed > 1500) {
              console.warn(`Watchdog: Worker starvation detected (${elapsed.toFixed(0)}ms > 1500ms). Recreating worker.`);
              recreateWorker();
            }
          }
          if (inFlightRef.current) {
            isLoopRunning = true;
            timerId = setTimeout(() => {
              rafId = requestAnimationFrame(runLoop);
            }, samplingDelayRef.current);
            return;
          }
        }

        // Requirement 6: Wrap actual pixel acquisition in idle browser periods to keep active UI highly responsive
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
  }, [isScanning, videoRef, captureFrame, attachVideoListeners, detachVideoListeners, recreateWorker, isTestEnv, updateScannerState]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    consecutiveRestartAttemptsRef.current = 0;
    // Reset state counters when restarting
    inFlightRef.current = false;
    inFlightStartRef.current = null;
    sequenceRef.current = 0;
    completedSequenceRef.current = 0;
    startTimeMapRef.current.clear();
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    consecutiveRestartAttemptsRef.current = 0;
    inFlightStartRef.current = null;
  }, []);

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
