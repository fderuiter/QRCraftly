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

  // Sync ref with option functions to avoid re-triggering effects on callbacks change
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailRef = useRef(onScanFail);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailRef.current = onScanFail;
  }, [onScanSuccess, onScanFail]);

  // Handle worker initialization and communication lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('../utils/scannerWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    const handleMessage = (e: MessageEvent) => {
      const payload = e.data;

      // Schema validation
      if (!isValidScannerResponse(payload)) {
        console.error('Invalid scanner response payload:', payload);
        return;
      }

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
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [minSamplingDelay, maxSamplingDelay]);

  // Frame Capture and Dispatch Loop
  useEffect(() => {
    if (!isScanning) {
      setStatus('idle');
      return;
    }

    let active = true;
    let timerId: any = null;
    let rafId: any = null;

    const runLoop = () => {
      if (!active) return;

      const performCapture = () => {
        // Requirement 2 / Constraint: Block new frame dispatches while in-flight
        if (inFlightRef.current) {
          // Discard incoming frame and schedule next capture based on delay
          timerId = setTimeout(() => {
            rafId = requestAnimationFrame(runLoop);
          }, samplingDelay);
          return;
        }

        const video = videoRef.current;
        if (!video || video.paused || video.ended) {
          timerId = setTimeout(() => {
            rafId = requestAnimationFrame(runLoop);
          }, samplingDelay);
          return;
        }

        // Requirement 6: Wrap actual pixel acquisition in idle browser periods to keep active UI highly responsive
        const acquireAndDispatch = () => {
          if (!active) return;
          try {
            const width = video.videoWidth || 640;
            const height = video.videoHeight || 480;
            if (width === 0 || height === 0) {
              timerId = setTimeout(() => {
                rafId = requestAnimationFrame(runLoop);
              }, samplingDelay);
              return;
            }

            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            const canvas = canvasRef.current;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              timerId = setTimeout(() => {
                rafId = requestAnimationFrame(runLoop);
              }, samplingDelay);
              return;
            }

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

            const buffer = poolRef.current.pop();
            if (!buffer) {
              // Enforce strict limit. If pool is somehow empty, discard frame and try next cycle
              timerId = setTimeout(() => {
                rafId = requestAnimationFrame(runLoop);
              }, samplingDelay);
              return;
            }

            // Copy pixel values from imageData.data into the recycled ArrayBuffer
            const bufferView = new Uint8ClampedArray(buffer);
            bufferView.set(imageData.data);

            inFlightRef.current = true;
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

          } catch (err) {
            console.error('Failed to capture or dispatch camera frame:', err);
          }

          // Schedule next run
          timerId = setTimeout(() => {
            rafId = requestAnimationFrame(runLoop);
          }, samplingDelay);
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
    rafId = requestAnimationFrame(runLoop);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isScanning, samplingDelay, videoRef]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    // Reset state counters when restarting
    inFlightRef.current = false;
    sequenceRef.current = 0;
    completedSequenceRef.current = 0;
    startTimeMapRef.current.clear();
    poolRef.current = [];
    currentWidthRef.current = 0;
    currentHeightRef.current = 0;
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
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
  };
}
