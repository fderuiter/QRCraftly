import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScanResult, ScanOptions, ScannerStatus } from './lib/contracts';
import { scanSource } from './lib/sourceExtractor';
import {
  createCameraScannerEngine,
  type CameraScannerEngine,
  type CameraScannerEngineMetrics,
} from './lib/cameraEngine';

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
}

/**
 * Thin React adapter over the Camera Scanner Engine: creates the engine lazily, keeps its options in
 * sync, bridges its events into (batched) React state and destroys it on unmount. The background
 * worker is private to the engine and never exposed.
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

  const latest = useRef({ videoRef, onScanSuccess, onScanFail });
  useEffect(() => {
    latest.current = { videoRef, onScanSuccess, onScanFail };
  }, [videoRef, onScanSuccess, onScanFail]);

  const pending = useRef<{ status: ScannerStatus; metrics: CameraScannerEngineMetrics; dirty: boolean }>({
    status: 'idle',
    metrics: { samplingDelay: INITIAL_SAMPLING_DELAY, latencyHistory: [] },
    dirty: false,
  });
  const isScanningRef = useRef(false);
  const boundsRef = useRef({ minSamplingDelay, maxSamplingDelay });
  const engineRef = useRef<CameraScannerEngine | null>(null);

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
  };
}
