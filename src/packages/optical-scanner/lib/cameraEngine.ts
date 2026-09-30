import { getDownscaledDimensions, isValidScannerResponse, type ScannerStatus } from './contracts';
import { AdaptiveFrameScheduler } from './scheduler';
import { decodeImageDataSync } from './decodeSync';
import { systemClock, type ScannerClock } from './clock';
import {
  connectSharedScannerWorker,
  type ScannerWorkerFactory,
  type ScannerWorkerHandle,
} from './workerRunner';

/** Base starvation watchdog budget for one in-flight worker frame. */
const WATCHDOG_TIMEOUT_MS = 1500;
/** Upper bound for the exponentially backed-off watchdog budget. */
const MAX_WATCHDOG_TIMEOUT_MS = 6000;
/** Consecutive worker restarts allowed before the engine switches to main-thread decoding. */
const MAX_WORKER_RESTARTS = 3;
/** Longest edge of a frame posted to the worker. */
const WORKER_MAX_DIMENSION = 1280;
/** Longest edge of a frame decoded on the main thread (kept smaller to protect the UI thread). */
const MAIN_THREAD_MAX_DIMENSION = 800;
const DEFAULT_FRAME_WIDTH = 640;
/** `HTMLMediaElement.HAVE_CURRENT_DATA`. */
const HAVE_CURRENT_DATA = 2;
const DEFAULT_FRAME_HEIGHT = 480;

type SourceEvent = 'pause' | 'seeked' | 'play' | 'playing' | 'loadeddata';

/**
 * The subset of `HTMLVideoElement` the engine samples from. Any `HTMLVideoElement` satisfies it;
 * headless tests pass a plain object.
 */
export interface CameraFrameSource {
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly srcObject: unknown;
  readonly src: string;
  readonly currentSrc: string;
  /** `HTMLMediaElement.readyState`; frames are skipped until it reaches HAVE_CURRENT_DATA (2). */
  readonly readyState?: number;
  addEventListener(type: SourceEvent, listener: () => void): void;
  removeEventListener(type: SourceEvent, listener: () => void): void;
}

/** Raw RGBA pixels for main-thread decoding. */
export interface CameraFramePixels {
  data: Uint8ClampedArray;
}

/**
 * Turns the current frame of a source into worker or main-thread input.
 */
export interface CameraFrameGrabber {
  /** Captures a downscaled, transferable bitmap for the worker. */
  grabBitmap(source: CameraFrameSource, width: number, height: number): Promise<ImageBitmap>;
  /** Captures downscaled RGBA pixels for the main-thread fallback, or null when no canvas exists. */
  grabPixels(source: CameraFrameSource, width: number, height: number): CameraFramePixels | null;
}

export interface CameraScannerEngineOptions {
  /** Minimum sleep between frame captures in milliseconds (default 16). */
  minSamplingDelay?: number;
  /** Maximum sleep between frame captures in milliseconds (default 1000). */
  maxSamplingDelay?: number;
}

export interface CameraScannerEngineMetrics {
  samplingDelay: number;
  latencyHistory: number[];
}

export interface CameraScannerEngineEvents {
  onScanSuccess?: (data: string) => void;
  onScanFail?: (error?: string) => void;
  onStatusChange?: (status: ScannerStatus) => void;
  onMetricsChange?: (metrics: CameraScannerEngineMetrics) => void;
}

export interface CameraScannerEngineConfig extends CameraScannerEngineOptions {
  /** Returns the element to sample, read on every tick so it may change between frames. */
  getSource: () => CameraFrameSource | null | undefined;
  /** Worker factory; defaults to the package's shared scanner worker. */
  createWorker?: ScannerWorkerFactory;
  /** Time source; defaults to the system clock. */
  clock?: ScannerClock;
  /** Frame grabber; defaults to `createImageBitmap` and a 2D canvas. */
  grabber?: CameraFrameGrabber;
  /** Main-thread decoder used after worker fallback; defaults to jsQR. */
  decodeSync?: (pixels: CameraFramePixels, width: number, height: number) => string | null;
}

/**
 * Headless camera scanning engine: owns the frame loop, adaptive sampling, the private worker
 * (epochs, watchdog, backoff and main-thread fallback) and backpressure.
 */
export interface CameraScannerEngine {
  /** Starts (or restarts) sampling frames from the source. */
  start(): void;
  /** Stops sampling; the engine can be started again. */
  stop(): void;
  /** Stops sampling, detaches from the worker and drops all listeners. The engine is unusable afterwards. */
  destroy(): void;
  /** Registers event listeners and returns a function that removes them. */
  subscribe(events: CameraScannerEngineEvents): () => void;
  /** Updates the adaptive sampling bounds. */
  setOptions(options: CameraScannerEngineOptions): void;
  /** Latest sampling metrics. */
  getMetrics(): CameraScannerEngineMetrics;
}

function isVideoElement(source: CameraFrameSource): source is CameraFrameSource & HTMLVideoElement {
  return typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
}

/**
 * Default grabber backed by `createImageBitmap` and a reusable 2D canvas.
 */
function createDefaultGrabber(): CameraFrameGrabber {
  let canvas: HTMLCanvasElement | null = null;
  return {
    grabBitmap: (source, width, height) => {
      if (!isVideoElement(source) || typeof createImageBitmap !== 'function') {
        return Promise.reject(new Error('Frame source cannot be captured as an ImageBitmap'));
      }
      return createImageBitmap(source, { resizeWidth: width, resizeHeight: height, resizeQuality: 'low' });
    },
    grabPixels: (source, width, height) => {
      if (!isVideoElement(source) || typeof document === 'undefined') return null;
      canvas ??= document.createElement('canvas');
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, width, height);
      return ctx.getImageData(0, 0, width, height);
    },
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Creates a Camera Scanner Engine. Nothing runs until `start()` is called.
 */
export function createCameraScannerEngine(config: CameraScannerEngineConfig): CameraScannerEngine {
  const clock = config.clock ?? systemClock;
  const createWorker = config.createWorker ?? connectSharedScannerWorker;
  const grabber = config.grabber ?? createDefaultGrabber();
  const decodeSync = config.decodeSync ?? decodeImageDataSync;
  const { getSource } = config;

  const listeners = new Set<CameraScannerEngineEvents>();
  const emit = (notify: (events: CameraScannerEngineEvents) => void) => {
    for (const events of [...listeners]) notify(events);
  };

  let worker: ScannerWorkerHandle | null = null;
  let epoch = 0;
  let restartAttempts = 0;
  let useMainThread = false;
  let running = false;
  let destroyed = false;
  let loopSuspended = false;
  let timerId: number | null = null;
  let frameId: number | null = null;
  let boundSource: { source: CameraFrameSource; handlers: Array<[SourceEvent, () => void]> } | null = null;

  const scheduler = new AdaptiveFrameScheduler({
    minSamplingDelay: config.minSamplingDelay,
    maxSamplingDelay: config.maxSamplingDelay,
    clock,
    onStatusChange: (status) => emit((e) => e.onStatusChange?.(status)),
    onDelayChange: () => emit((e) => e.onMetricsChange?.(getMetrics())),
    onLatencyHistoryChange: () => emit((e) => e.onMetricsChange?.(getMetrics())),
    onScanSuccess: (data) => emit((e) => e.onScanSuccess?.(data)),
    onScanFail: (error) => emit((e) => e.onScanFail?.(error ?? undefined)),
    onWatchdogTriggered: () => recoverWorker(),
  });

  function getMetrics(): CameraScannerEngineMetrics {
    return {
      samplingDelay: scheduler.getSamplingDelay(),
      latencyHistory: [...scheduler.getLatencyHistory()],
    };
  }

  function markWorkerHealthy() {
    restartAttempts = 0;
    scheduler.setWatchdogTimeout(WATCHDOG_TIMEOUT_MS);
  }

  function handleWorkerMessage(owner: ScannerWorkerHandle, payload: unknown) {
    if (owner !== worker) return;
    if (!isValidScannerResponse(payload)) {
      console.error('Invalid scanner response payload:', payload);
      return;
    }
    if (payload.epochId !== undefined && payload.epochId !== epoch) {
      // Response produced for a worker generation that has since been replaced.
      return;
    }
    if (payload.status === 'pass' || payload.error !== 'STALE_FRAME') {
      markWorkerHealthy();
    }
    scheduler.endFrame(payload.sequenceId, payload.status, payload.decodedData, payload.error, payload.buffer);
  }

  function spawnWorker() {
    let handle: ScannerWorkerHandle | null = null;
    try {
      handle = createWorker({
        onMessage: (data) => {
          if (handle) handleWorkerMessage(handle, data);
        },
        onError: (reason) => {
          if (handle && handle === worker) {
            console.error('Scanner worker thread error:', reason);
            recoverWorker();
          }
        },
      });
      worker = handle;
    } catch (err) {
      console.warn('Scanner worker unavailable, activating main-thread fallback:', err);
      worker = null;
      useMainThread = true;
    }
  }

  function discardWorker() {
    const current = worker;
    worker = null;
    if (!current) return;
    try {
      current.terminate();
    } catch (err) {
      console.error('Failed to terminate scanner worker:', err);
    }
  }

  function recoverWorker() {
    if (destroyed || useMainThread) return;
    restartAttempts += 1;
    epoch += 1;
    discardWorker();

    if (restartAttempts > MAX_WORKER_RESTARTS) {
      console.warn('Scanner worker failed repeatedly. Activating main-thread fallback.');
      useMainThread = true;
      scheduler.setWatchdogTimeout(WATCHDOG_TIMEOUT_MS);
      scheduler.triggerRecovery(WATCHDOG_TIMEOUT_MS, false);
      return;
    }

    const nextTimeout = Math.min(MAX_WATCHDOG_TIMEOUT_MS, WATCHDOG_TIMEOUT_MS * 2 ** restartAttempts);
    console.warn(
      `Watchdog: Recreating scanner worker. Attempt ${restartAttempts} of ${MAX_WORKER_RESTARTS} consecutive retries.`
    );
    scheduler.setWatchdogTimeout(nextTimeout);
    scheduler.triggerRecovery(nextTimeout, false);
    spawnWorker();
  }

  function decodeOnMainThread(source: CameraFrameSource, seqId: number, width: number, height: number) {
    const dims = getDownscaledDimensions(width, height, MAIN_THREAD_MAX_DIMENSION);
    let pixels: CameraFramePixels | null;
    try {
      pixels = grabber.grabPixels(source, dims.width, dims.height);
    } catch (err) {
      console.error('Failed to read frame pixels for main-thread decode:', err);
      scheduler.endFrame(seqId, 'fail', null, 'CANVAS_READ_ERROR');
      return;
    }
    if (!pixels) {
      scheduler.endFrame(seqId, 'fail', null, 'CANVAS_UNAVAILABLE');
      return;
    }
    const frame = pixels;
    clock.setTimeout(() => {
      try {
        const decoded = decodeSync(frame, dims.width, dims.height);
        if (decoded) {
          restartAttempts = 0;
          scheduler.endFrame(seqId, 'pass', decoded, null);
        } else {
          scheduler.endFrame(seqId, 'fail', null, null);
        }
      } catch (err) {
        console.error('Main-thread QR decoding error:', err);
        scheduler.endFrame(seqId, 'fail', null, errorMessage(err, 'DECODE_ERROR'));
      }
    }, 0);
  }

  function decodeOnWorker(source: CameraFrameSource, seqId: number, width: number, height: number) {
    const dims = getDownscaledDimensions(width, height, WORKER_MAX_DIMENSION);
    grabber
      .grabBitmap(source, dims.width, dims.height)
      .then((image) => {
        const target = worker;
        if (!target) {
          image.close();
          scheduler.endFrame(seqId, 'fail', null, 'WORKER_UNAVAILABLE');
          return;
        }
        try {
          target.postFrame(
            { image, width: dims.width, height: dims.height, sequenceId: seqId, epochId: epoch },
            [image]
          );
        } catch (err) {
          console.error('Failed to post camera frame to scanner worker:', err);
          scheduler.endFrame(seqId, 'fail', null, 'DISPATCH_ERROR');
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to capture camera frame:', err);
        scheduler.endFrame(seqId, 'fail', null, 'CAPTURE_ERROR');
      });
  }

  /** Captures one frame. `force` bypasses backpressure (used for paused or seeked video files). */
  function captureFrame(force = false): boolean {
    const source = getSource();
    if (!source) return false;
    // A stream that has not delivered its first frame yet cannot be captured.
    if (typeof source.readyState === 'number' && source.readyState < HAVE_CURRENT_DATA) return false;
    if (!force && scheduler.getInFlight()) return false;

    const width = source.videoWidth || DEFAULT_FRAME_WIDTH;
    const height = source.videoHeight || DEFAULT_FRAME_HEIGHT;
    const seqId = scheduler.beginFrame(force);
    if (seqId === null) return false;

    if (useMainThread || !worker) {
      decodeOnMainThread(source, seqId, width, height);
    } else {
      decodeOnWorker(source, seqId, width, height);
    }
    return true;
  }

  function clearLoopTimers() {
    if (timerId !== null) {
      clock.clearTimeout(timerId);
      timerId = null;
    }
    if (frameId !== null) {
      clock.cancelFrame(frameId);
      frameId = null;
    }
  }

  function scheduleNextTick() {
    clearLoopTimers();
    timerId = clock.setTimeout(() => {
      timerId = null;
      frameId = clock.requestFrame(tick);
    }, scheduler.getSamplingDelay());
  }

  function resumeLoop() {
    if (!running || !loopSuspended) return;
    loopSuspended = false;
    clearLoopTimers();
    frameId = clock.requestFrame(tick);
  }

  function unbindSource() {
    if (!boundSource) return;
    const { source, handlers } = boundSource;
    boundSource = null;
    for (const [type, handler] of handlers) {
      try {
        source.removeEventListener(type, handler);
      } catch (err) {
        console.error('Failed to detach video listeners:', err);
      }
    }
  }

  function bindSource(source: CameraFrameSource) {
    if (boundSource?.source === source) return;
    unbindSource();
    const captureNow = () => {
      captureFrame(true);
    };
    const handlers: Array<[SourceEvent, () => void]> = [
      ['pause', captureNow],
      ['seeked', captureNow],
      ['loadeddata', captureNow],
      ['play', resumeLoop],
      ['playing', resumeLoop],
    ];
    for (const [type, handler] of handlers) {
      source.addEventListener(type, handler);
    }
    boundSource = { source, handlers };
  }

  function tick() {
    frameId = null;
    if (!running) return;

    const source = getSource();
    if (!source) {
      scheduleNextTick();
      return;
    }

    const isVideoFile = !source.srcObject && (!!source.src || !!source.currentSrc);
    if (isVideoFile) {
      bindSource(source);
      if (source.paused || source.ended) {
        // Paused or finished video files are sampled once; play/seeked events drive the rest.
        captureFrame(true);
        loopSuspended = true;
        return;
      }
    } else {
      unbindSource();
      if (source.paused || source.ended) {
        scheduleNextTick();
        return;
      }
    }

    if (scheduler.getInFlight()) {
      scheduler.checkWatchdog();
      if (scheduler.getInFlight()) {
        scheduleNextTick();
        return;
      }
    }

    captureFrame();
    scheduleNextTick();
  }

  function start() {
    if (destroyed) return;
    restartAttempts = 0;
    epoch += 1;
    scheduler.setWatchdogTimeout(WATCHDOG_TIMEOUT_MS);
    scheduler.start();
    if (!worker && !useMainThread) {
      spawnWorker();
    }
    if (!running) {
      running = true;
      loopSuspended = false;
      clearLoopTimers();
      frameId = clock.requestFrame(tick);
    }
  }

  function stop() {
    const wasRunning = running;
    running = false;
    loopSuspended = false;
    clearLoopTimers();
    unbindSource();
    restartAttempts = 0;
    scheduler.setWatchdogTimeout(WATCHDOG_TIMEOUT_MS);
    scheduler.stop();
    if (wasRunning) emit((e) => e.onStatusChange?.('idle'));
  }

  function destroy() {
    if (destroyed) return;
    stop();
    destroyed = true;
    const current = worker;
    worker = null;
    current?.release();
    listeners.clear();
  }

  return {
    start,
    stop,
    destroy,
    subscribe: (events) => {
      listeners.add(events);
      return () => {
        listeners.delete(events);
      };
    },
    setOptions: (options) => {
      scheduler.setSamplingBounds(options.minSamplingDelay ?? 16, options.maxSamplingDelay ?? 1000);
    },
    getMetrics,
  };
}
