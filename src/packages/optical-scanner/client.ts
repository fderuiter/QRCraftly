import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScanResult, ScanOptions, ScannerStatus } from './lib/contracts';
import { scanSource } from './lib/sourceExtractor';
import {
  createCameraScannerEngine,
  type CameraScannerEngine,
  type CameraScannerEngineMetrics,
} from './lib/cameraEngine';
import {
  createCameraSession,
  type CameraSession,
  type CameraSessionStartOptions,
  type CameraSessionState,
} from './lib/cameraSession';

export type { CameraSessionState, CameraSessionStartOptions } from './lib/cameraSession';

const IDLE_CAMERA: CameraSessionState = { status: 'idle' };

/** Interval at which high-frequency engine diagnostics are flushed into React state. */
const STATE_FLUSH_INTERVAL_MS = 250;
const INITIAL_SAMPLING_DELAY = 33;

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
   * The camera: `idle`, `requesting`, `streaming`, or `denied` / `unavailable` / `error` with the
   * error that caused it.
   */
  state: CameraSessionState;
  /**
   * Opens the camera in `videoRef`'s element and starts scanning. Idempotent: calling it while the
   * camera is requested or streaming does nothing, so it is safe in effects that run twice.
   */
  start: (options?: CameraSessionStartOptions) => Promise<void>;
  /** Releases the camera (every track), detaches the element and stops scanning. Idempotent. */
  stop: () => void;
  /** The element the camera is shown in: the one passed in, or one the hook owns. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
   * Starts the frame loop on a source the caller attached itself (for example a video file).
   * Camera scanning uses `start` instead, which owns the stream.
   */
  startScanning: () => void;
  /**
   * Stops the frame loop started by `startScanning`.
   */
  stopScanning: () => void;
  /**
   * Unified file scanning method (processes images, WebM, and MKV video files).
   */
  scanFile: (file: File, options?: ScanOptions) => Promise<ScanResult>;
}

/**
 * Thin React adapter over the Camera Session and the Camera Scanner Engine: creates them lazily,
 * keeps the sampling bounds in sync, bridges their events into (batched) React state and destroys
 * them on unmount. The camera stream and the background worker are private to the package.
 */
export function useQrScanner({
  videoRef,
  onScanSuccess,
  onScanFail,
  minSamplingDelay = 16,
  maxSamplingDelay = 1000,
}: UseQrScannerOptions = {}): UseQrScannerResult {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [samplingDelay, setSamplingDelay] = useState<number>(INITIAL_SAMPLING_DELAY);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [cameraState, setCameraState] = useState<CameraSessionState>(IDLE_CAMERA);
  const ownVideoRef = useRef<HTMLVideoElement | null>(null);
  const resolvedVideoRef = videoRef ?? ownVideoRef;

  const latest = useRef({ videoRef: resolvedVideoRef, onScanSuccess, onScanFail });
  useEffect(() => {
    latest.current = { videoRef: resolvedVideoRef, onScanSuccess, onScanFail };
  }, [resolvedVideoRef, onScanSuccess, onScanFail]);

  const pending = useRef<{ status: ScannerStatus; metrics: CameraScannerEngineMetrics; dirty: boolean }>({
    status: 'idle',
    metrics: { samplingDelay: INITIAL_SAMPLING_DELAY, latencyHistory: [] },
    dirty: false,
  });
  const isScanningRef = useRef(false);
  const boundsRef = useRef({ minSamplingDelay, maxSamplingDelay });
  const engineRef = useRef<CameraScannerEngine | null>(null);
  const sessionRef = useRef<CameraSession | null>(null);

  const getEngine = useCallback((): CameraScannerEngine => {
    if (engineRef.current) return engineRef.current;
    const engine = createCameraScannerEngine({
      ...boundsRef.current,
      getSource: () => latest.current.videoRef?.current ?? null,
    });
    engine.subscribe({
      onScanSuccess: (data) => latest.current.onScanSuccess?.(data),
      onScanFail: (error) => latest.current.onScanFail?.(error),
      onStatusChange: (next) => {
        pending.current.status = next;
        pending.current.dirty = true;
      },
      onMetricsChange: (metrics) => {
        pending.current.metrics = metrics;
        pending.current.dirty = true;
      },
    });
    engineRef.current = engine;
    return engine;
  }, []);

  useEffect(() => {
    boundsRef.current = { minSamplingDelay, maxSamplingDelay };
    engineRef.current?.setOptions({ minSamplingDelay, maxSamplingDelay });
  }, [minSamplingDelay, maxSamplingDelay]);

  // Batch high-frequency diagnostics so a 60 FPS loop does not re-render the tree every frame.
  useEffect(() => {
    if (!isScanning) return;
    const intervalId = setInterval(() => {
      const snapshot = pending.current;
      if (!snapshot.dirty) return;
      snapshot.dirty = false;
      setStatus(snapshot.status);
      setSamplingDelay(snapshot.metrics.samplingDelay);
      setLatencyHistory(snapshot.metrics.latencyHistory);
    }, STATE_FLUSH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isScanning]);

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const startScanning = useCallback(() => {
    isScanningRef.current = true;
    setIsScanning(true);
    getEngine().start();
  }, [getEngine]);

  const stopScanning = useCallback(() => {
    const wasScanning = isScanningRef.current;
    isScanningRef.current = false;
    setIsScanning(false);
    engineRef.current?.stop();
    pending.current.status = 'idle';
    pending.current.dirty = false;
    setStatus('idle');

    if (wasScanning && typeof window !== 'undefined') {
      const { latencyHistory: history, samplingDelay: delay } = pending.current.metrics;
      window.dispatchEvent(
        new CustomEvent('scanner-telemetry-dispatch', {
          detail: {
            latencyHistory: history,
            frameDropCount: 0,
            processingLatency: delay,
            sessionType: 'camera',
          },
        })
      );
    }
  }, []);

  const getSession = useCallback((): CameraSession => {
    if (sessionRef.current) return sessionRef.current;
    const session = createCameraSession({
      getVideo: () => latest.current.videoRef.current,
      loop: { start: startScanning, stop: stopScanning },
    });
    session.subscribe(setCameraState);
    sessionRef.current = session;
    return session;
  }, [startScanning, stopScanning]);

  const start = useCallback((options?: CameraSessionStartOptions) => getSession().start(options), [getSession]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const scanFile = useCallback(async (file: File, options?: ScanOptions): Promise<ScanResult> => {
    return scanSource(file, options);
  }, []);

  return {
    state: cameraState,
    start,
    stop,
    videoRef: resolvedVideoRef,
    isScanning,
    status,
    samplingDelay,
    latencyHistory,
    startScanning,
    stopScanning,
    scanFile,
  };
}
