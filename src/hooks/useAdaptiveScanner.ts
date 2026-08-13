import { useState, useEffect, useRef, useCallback } from 'react';
import { isValidScannerResponse } from '../utils/scannerContract';

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

  const samplingDelayRef = useRef<number>(33);

  // Keep ref in sync with state for continuous tick lookups
  useEffect(() => {
    samplingDelayRef.current = samplingDelay;
  }, [samplingDelay]);

  const workerRef = useRef<Worker | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const sequenceRef = useRef<number>(0);
  const completedSequenceRef = useRef<number>(0);

  // Buffer Pool: Maintain a pool of pre-allocated buffers inside a useRef (double buffering)
  const poolRef = useRef<ArrayBuffer[]>([]);
  const currentWidthRef = useRef<number>(0);
  const currentHeightRef = useRef<number>(0);

  // Track start times of in-flight requests mapped by sequenceId
  const startTimeMapRef = useRef<Map<number, number>>(new Map());
  const latencyHistoryRef = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      poolRef.current = [];
      currentWidthRef.current = 0;
      currentHeightRef.current = 0;
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
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch (err) {
        console.error('Failed to terminate old worker during recovery:', err);
      }
      workerRef.current = null;
    }

    // 3. Clear/reset in-flight sequence tracking flags
    inFlightRef.current = false;
    inFlightStartRef.current = null;
    startTimeMapRef.current.clear();

    // 4. Replenish the double-buffering pool with exactly two ArrayBuffer instances matching the current dimension
    if (currentWidthRef.current > 0 && currentHeightRef.current > 0) {
      const bufferSize = currentWidthRef.current * currentHeightRef.current * 4;
      poolRef.current = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
      ];
    } else {
      poolRef.current = [];
    }

    // 5. Create new worker
    if (typeof window === 'undefined') return;
    try {
      const worker = new Worker(new URL('../utils/scannerWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      // 6. Re-attach listeners via delegating wrappers
      const onMsg = (e: MessageEvent) => handleMessageRef.current?.(e);
      const onErr = (err: any) => handleErrorRef.current?.(err);
      const onMsgErr = (err: any) => handleMessageErrorRef.current?.(err);

      worker.addEventListener('message', onMsg);
      worker.addEventListener('error', onErr);
      worker.addEventListener('messageerror', onMsgErr);
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

    const { status: resultStatus, sequenceId, decodedData, error, buffer } = payload;

    // Recycle buffer back into the pool even if message is stale
    if (buffer && buffer.byteLength === currentWidthRef.current * currentHeightRef.current * 4) {
      if (!poolRef.current.includes(buffer)) {
        if (poolRef.current.length < 2) {
          poolRef.current.push(buffer);
        }
      }
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
      setLatencyHistory(updatedHistory);

      // Update status state
      setStatus(resultStatus);

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
      setSamplingDelay((prevDelay) => {
        const avgDuration = updatedHistory.reduce((a, b) => a + b, 0) / updatedHistory.length;
        const latencyMetric = Math.max(duration, avgDuration);

        if (latencyMetric > 100) {
          // Scale down: increase sampling delay (slower capture rate)
          return Math.min(maxSamplingDelay, Math.max(prevDelay + 50, latencyMetric * 1.5));
        } else if (latencyMetric < 40) {
          // Scale up: decrease sampling delay (faster capture rate)
          return Math.max(minSamplingDelay, prevDelay - 10);
        }
        return prevDelay;
      });

      // Release the in-flight block to allow next frame dispatches
      inFlightRef.current = false;
      inFlightStartRef.current = null;
    }
  }, [minSamplingDelay, maxSamplingDelay]);

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

    const worker = new Worker(new URL('../utils/scannerWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    const onMsg = (e: MessageEvent) => handleMessageRef.current?.(e);
    const onErr = (err: any) => handleErrorRef.current?.(err);
    const onMsgErr = (err: any) => handleMessageErrorRef.current?.(err);

    worker.addEventListener('message', onMsg);
    worker.addEventListener('error', onErr);
    worker.addEventListener('messageerror', onMsgErr);

    return () => {
      const activeWorker = workerRef.current;
      if (activeWorker) {
        activeWorker.terminate();
        workerRef.current = null;
      }
      if (activeWorker !== worker) {
        worker.terminate();
      }
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

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Copy video frame onto offscreen canvas and grab ImageData
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      // Increment sequence and track start time
      sequenceRef.current += 1;
      const seqId = sequenceRef.current;

      // Lazily initialize/resize pool with exactly 2 buffers once resolution is known
      if (width !== currentWidthRef.current || height !== currentHeightRef.current) {
        currentWidthRef.current = width;
        currentHeightRef.current = height;
        const bufferSize = width * height * 4;
        poolRef.current = [
          new ArrayBuffer(bufferSize),
          new ArrayBuffer(bufferSize),
        ];
      }

      let buffer = poolRef.current.pop();
      if (!buffer) {
        buffer = new ArrayBuffer(width * height * 4);
      }

      // Copy pixel values from imageData.data into the recycled ArrayBuffer
      const bufferView = new Uint8ClampedArray(buffer);
      bufferView.set(imageData.data);

      inFlightRef.current = true;
      inFlightStartRef.current = performance.now();
      startTimeMapRef.current.set(seqId, performance.now());
      setStatus('checking');

      // Requirement 4: Transfer buffer to eliminate memory copying overhead (zero-copy)
      workerRef.current?.postMessage(
        {
          buffer,
          width,
          height,
          sequenceId: seqId,
        },
        [buffer]
      );
      return true;
    } catch (err) {
      console.error('Failed to capture or dispatch camera frame:', err);
      return false;
    }
  }, [videoRef]);

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
      setStatus('idle');
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
  }, [isScanning, videoRef, captureFrame, attachVideoListeners, detachVideoListeners, recreateWorker]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    consecutiveRestartAttemptsRef.current = 0;
    // Reset state counters when restarting
    inFlightRef.current = false;
    inFlightStartRef.current = null;
    sequenceRef.current = 0;
    completedSequenceRef.current = 0;
    startTimeMapRef.current.clear();
    poolRef.current = [];
    currentWidthRef.current = 0;
    currentHeightRef.current = 0;
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    consecutiveRestartAttemptsRef.current = 0;
    inFlightStartRef.current = null;
    poolRef.current = [];
    currentWidthRef.current = 0;
    currentHeightRef.current = 0;
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
