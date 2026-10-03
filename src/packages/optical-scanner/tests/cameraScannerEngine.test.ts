/**
 * Headless tests for the Camera Scanner Engine.
 *
 * Runs in the node environment with no React, no DOM and no global worker mock: the frame source,
 * worker and clock are all fakes injected through the engine's public configuration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCameraScannerEngine,
  type CameraFrameGrabber,
  type CameraFrameSource,
  type CameraScannerEngine,
  type CameraScannerEngineConfig,
  type ScannerClock,
  type ScannerRequest,
  type ScannerResponse,
  type ScannerWorkerFactory,
  type ScannerWorkerHandlers,
} from '../index';
import { createStaleFrameGuard } from '../lib/frameGuard';

/** Deterministic clock: timers and display frames fire only when the test advances time. */
class FakeClock implements ScannerClock {
  private current = 0;
  private nextId = 1;
  private tasks = new Map<number, { at: number; callback: () => void }>();

  now() {
    return this.current;
  }

  setTimeout(callback: () => void, ms: number) {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.current + Math.max(0, ms), callback });
    return id;
  }

  clearTimeout(handle: number) {
    this.tasks.delete(handle);
  }

  requestFrame(callback: () => void) {
    return this.setTimeout(callback, 16);
  }

  cancelFrame(handle: number) {
    this.tasks.delete(handle);
  }

  get pendingCount() {
    return this.tasks.size;
  }

  /** Advances time, running every task that falls due (including tasks scheduled meanwhile). */
  advance(ms: number) {
    const target = this.current + ms;
    for (;;) {
      let nextId: number | null = null;
      let nextAt = Infinity;
      for (const [id, task] of this.tasks) {
        if (task.at <= target && task.at < nextAt) {
          nextAt = task.at;
          nextId = id;
        }
      }
      if (nextId === null) break;
      const task = this.tasks.get(nextId);
      this.tasks.delete(nextId);
      this.current = Math.max(this.current, nextAt);
      task?.callback();
    }
    this.current = target;
  }
}

type Listener = () => void;

/** Plain-object stand-in for an HTMLVideoElement. */
class FakeSource implements CameraFrameSource {
  videoWidth = 1920;
  videoHeight = 1080;
  paused = false;
  ended = false;
  srcObject: unknown = { id: 'camera-stream' };
  src = '';
  currentSrc = '';
  readyState?: number;
  readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }

  get listenerCount() {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }
}

/** Fake worker generation. Tests answer frames through `reply`, `crash`, or not at all (stall). */
class FakeWorker {
  readonly frames: ScannerRequest[] = [];
  released = false;
  terminated = false;

  constructor(private readonly handlers: ScannerWorkerHandlers) {}

  get attached() {
    return !this.released && !this.terminated;
  }

  reply(frame: ScannerRequest, response: Partial<ScannerResponse>) {
    this.handlers.onMessage({
      status: 'fail',
      sequenceId: frame.sequenceId,
      epochId: frame.epochId,
      ...response,
    });
  }

  replyLatest(response: Partial<ScannerResponse>) {
    const frame = this.frames.at(-1);
    if (!frame) throw new Error('No frame has been posted to this worker');
    this.reply(frame, response);
  }

  sendRaw(payload: unknown) {
    this.handlers.onMessage(payload);
  }

  crash() {
    this.handlers.onError(new Error('worker crashed'));
  }
}

function createHarness(overrides: Partial<CameraScannerEngineConfig> = {}) {
  const clock = new FakeClock();
  const source = new FakeSource();
  const workers: FakeWorker[] = [];
  let failSpawns = false;

  const createWorker: ScannerWorkerFactory = (handlers) => {
    if (failSpawns) throw new Error('SecurityError: worker blocked by CSP');
    const worker = new FakeWorker(handlers);
    workers.push(worker);
    return {
      postFrame: (request) => {
        worker.frames.push(request);
      },
      release: () => {
        worker.released = true;
      },
      terminate: () => {
        worker.terminated = true;
      },
    };
  };

  const grabber: CameraFrameGrabber = {
    grabBitmap: (_source, width, height) => Promise.resolve({ width, height, close: () => {} }),
    grabPixels: (_source, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  };

  const decodeSync = vi.fn<(pixels: { data: Uint8ClampedArray }, w: number, h: number) => string | null>(
    () => null
  );

  const events = {
    onScanSuccess: vi.fn<(data: string) => void>(),
    onScanFail: vi.fn<(error?: string) => void>(),
    onStatusChange: vi.fn<(status: string) => void>(),
    onMetricsChange: vi.fn<(metrics: { samplingDelay: number; latencyHistory: number[] }) => void>(),
  };

  const engine: CameraScannerEngine = createCameraScannerEngine({
    getSource: () => source,
    clock,
    createWorker,
    grabber,
    decodeSync,
    ...overrides,
  });
  const unsubscribe = engine.subscribe(events);

  /** Advances fake time and flushes the promise-based bitmap capture. */
  const step = async (ms: number) => {
    clock.advance(ms);
    await Promise.resolve();
    await Promise.resolve();
  };

  /** Steps time until the engine posts its next frame, then answers it after `latencyMs`. */
  const answerNextFrame = async (latencyMs: number, response: Partial<ScannerResponse>) => {
    const worker = workers.at(-1);
    const before = worker?.frames.length ?? 0;
    for (let i = 0; i < 200 && (worker?.frames.length ?? 0) === before; i++) {
      await step(4);
    }
    clock.advance(latencyMs);
    worker?.replyLatest(response);
  };

  return {
    clock,
    source,
    answerNextFrame,
    workers,
    engine,
    events,
    decodeSync,
    unsubscribe,
    step,
    currentWorker: () => workers.at(-1),
    blockWorkerSpawns: () => {
      failSpawns = true;
    },
  };
}

describe('Camera Scanner Engine (headless)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('decoding', () => {
    it('emits scan success with the decoded payload for a valid frame', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      expect(h.workers).toHaveLength(1);
      expect(h.currentWorker()?.frames).toHaveLength(1);

      h.currentWorker()?.replyLatest({ status: 'pass', decodedData: 'https://qrcraftly.com' });

      expect(h.events.onScanSuccess).toHaveBeenCalledWith('https://qrcraftly.com');
      expect(h.events.onStatusChange).toHaveBeenCalledWith('checking');
      expect(h.events.onStatusChange).toHaveBeenLastCalledWith('pass');
    });

    it('emits scan failure for a frame with no code', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      h.currentWorker()?.replyLatest({ status: 'fail', error: 'NOT_FOUND' });

      expect(h.events.onScanFail).toHaveBeenCalledWith('NOT_FOUND');
      expect(h.events.onScanSuccess).not.toHaveBeenCalled();
      expect(h.events.onStatusChange).toHaveBeenLastCalledWith('fail');
    });

    it('downscales large camera frames before posting them to the worker', async () => {
      const h = createHarness();
      h.source.videoWidth = 3840;
      h.source.videoHeight = 2160;
      h.engine.start();
      await h.step(16);

      const frame = h.currentWorker()?.frames[0];
      expect(frame?.width).toBe(1280);
      expect(frame?.height).toBe(720);
    });

    it('ignores malformed worker responses', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      h.currentWorker()?.sendRaw({ status: 'maybe', sequenceId: 'x' });

      expect(h.events.onScanSuccess).not.toHaveBeenCalled();
      expect(h.events.onScanFail).not.toHaveBeenCalled();
    });

    it('treats a STALE_FRAME response as dropped rather than failed', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      h.currentWorker()?.replyLatest({ status: 'fail', error: 'STALE_FRAME' });
      expect(h.events.onScanFail).not.toHaveBeenCalled();

      await h.step(33 + 16);
      expect(h.currentWorker()?.frames).toHaveLength(2);
    });

    it('does not emit results for out-of-order responses to older frames', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      const first = h.currentWorker()?.frames[0];
      h.currentWorker()?.replyLatest({ status: 'fail' });
      await h.step(33 + 16);
      const second = h.currentWorker()?.frames[1];
      expect(first && second).toBeTruthy();
      if (!first || !second) return;

      h.currentWorker()?.reply(second, { status: 'pass', decodedData: 'NEW' });
      h.currentWorker()?.reply(first, { status: 'pass', decodedData: 'OLD' });

      expect(h.events.onScanSuccess).toHaveBeenCalledTimes(1);
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('NEW');
    });
  });

  describe('backpressure and adaptive sampling', () => {
    it('does not dispatch a new frame while one is in flight', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      await h.step(500);

      expect(h.currentWorker()?.frames).toHaveLength(1);

      h.currentWorker()?.replyLatest({ status: 'fail' });
      await h.step(500);
      expect(h.currentWorker()?.frames).toHaveLength(2);
    });

    it('slows sampling when worker latency is high and speeds up when it is low', async () => {
      const h = createHarness();
      h.engine.start();

      for (let i = 0; i < 3; i++) {
        await h.answerNextFrame(300, { status: 'fail' });
      }
      const slowed = h.engine.getMetrics().samplingDelay;
      expect(slowed).toBeGreaterThan(100);
      expect(h.events.onMetricsChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ samplingDelay: slowed })
      );

      for (let i = 0; i < 8; i++) {
        await h.answerNextFrame(5, { status: 'fail' });
      }
      expect(h.engine.getMetrics().samplingDelay).toBeLessThan(slowed);
      expect(h.engine.getMetrics().latencyHistory.length).toBeLessThanOrEqual(5);
    });

    it('respects updated sampling bounds', async () => {
      const h = createHarness({ maxSamplingDelay: 1000 });
      h.engine.setOptions({ minSamplingDelay: 16, maxSamplingDelay: 120 });
      h.engine.start();

      for (let i = 0; i < 5; i++) {
        await h.answerNextFrame(900, { status: 'fail' });
      }
      expect(h.engine.getMetrics().samplingDelay).toBeLessThanOrEqual(120);
    });
  });

  describe('watchdog recovery', () => {
    it('recreates the worker after a 1500ms stall and keeps scanning', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      const first = h.currentWorker();

      await h.step(1400);
      expect(h.workers).toHaveLength(1);

      await h.step(300);
      expect(h.workers).toHaveLength(2);
      expect(first?.terminated).toBe(true);

      await h.step(1100);
      const second = h.currentWorker();
      expect(second?.frames.length).toBeGreaterThan(0);
      second?.replyLatest({ status: 'pass', decodedData: 'RECOVERED' });
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('RECOVERED');
    });

    it('drops late responses from a replaced worker', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      const first = h.currentWorker();
      const staleFrame = first?.frames[0];

      await h.step(1700);
      expect(h.workers).toHaveLength(2);

      if (staleFrame) first?.reply(staleFrame, { status: 'pass', decodedData: 'LATE' });
      expect(h.events.onScanSuccess).not.toHaveBeenCalled();
    });

    it('recovers from a worker crash event', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      h.currentWorker()?.crash();
      expect(h.workers).toHaveLength(2);
      expect(h.workers[0].terminated).toBe(true);

      await h.step(1100);
      h.currentWorker()?.replyLatest({ status: 'pass', decodedData: 'AFTER-CRASH' });
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('AFTER-CRASH');
    });

    it('backs off the watchdog exponentially between consecutive restarts', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);

      // First stall: 1500ms budget.
      await h.step(1600);
      expect(h.workers).toHaveLength(2);

      // Second generation stalls too: its budget has doubled to 3000ms.
      await h.step(1100);
      expect(h.workers[1].frames.length).toBe(1);
      await h.step(1500);
      expect(h.workers).toHaveLength(2);
      await h.step(600);
      expect(h.workers).toHaveLength(3);
    });

    it('resets the backoff once a worker answers again', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      h.currentWorker()?.crash();
      h.currentWorker()?.crash();
      expect(h.workers).toHaveLength(3);

      await h.step(1100);
      h.currentWorker()?.replyLatest({ status: 'fail' });

      // A fresh stall is detected with the base 1500ms budget again.
      await h.step(100);
      const beforeStall = h.workers.length;
      await h.step(1700);
      expect(h.workers.length).toBe(beforeStall + 1);
    });

    it('falls back to main-thread decoding after three failed restarts', async () => {
      const h = createHarness();
      h.decodeSync.mockReturnValue('MAIN-THREAD');
      h.engine.start();
      await h.step(16);

      h.currentWorker()?.crash();
      h.currentWorker()?.crash();
      h.currentWorker()?.crash();
      expect(h.workers).toHaveLength(4);
      h.currentWorker()?.crash();
      expect(h.workers).toHaveLength(4);
      expect(h.workers.every((w) => w.terminated)).toBe(true);

      await h.step(1100);
      expect(h.decodeSync).toHaveBeenCalled();
      const [, width, height] = h.decodeSync.mock.calls[0];
      expect(Math.max(width, height)).toBeLessThanOrEqual(800);
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('MAIN-THREAD');
      expect(h.workers).toHaveLength(4);
    });

    it('falls back to main-thread decoding when no worker can be spawned', async () => {
      const h = createHarness();
      h.blockWorkerSpawns();
      h.decodeSync.mockReturnValue('NO-WORKER');
      h.engine.start();
      await h.step(16);
      await h.step(1);

      expect(h.workers).toHaveLength(0);
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('NO-WORKER');
    });
  });

  describe('video sources and lifecycle', () => {
    it('does not sample a paused live stream', async () => {
      const h = createHarness();
      h.source.paused = true;
      h.engine.start();
      await h.step(500);
      expect(h.currentWorker()?.frames).toHaveLength(0);

      h.source.paused = false;
      await h.step(100);
      expect(h.currentWorker()?.frames).toHaveLength(1);
    });

    it('samples a paused video file once and again on seek, then resumes on play', async () => {
      const h = createHarness();
      h.source.srcObject = null;
      h.source.src = 'blob:recording';
      h.source.paused = true;
      h.engine.start();
      await h.step(16);
      expect(h.currentWorker()?.frames).toHaveLength(1);

      await h.step(500);
      expect(h.currentWorker()?.frames).toHaveLength(1);

      h.source.emit('seeked');
      await h.step(0);
      expect(h.currentWorker()?.frames).toHaveLength(2);

      h.currentWorker()?.replyLatest({ status: 'fail' });
      h.source.paused = false;
      h.source.emit('play');
      await h.step(16);
      expect(h.currentWorker()?.frames).toHaveLength(3);
    });

    it('stop suspends sampling and detaches source listeners; start resumes cleanly', async () => {
      const h = createHarness();
      h.source.srcObject = null;
      h.source.src = 'blob:recording';
      h.engine.start();
      await h.step(16);
      expect(h.source.listenerCount).toBeGreaterThan(0);

      h.engine.stop();
      expect(h.source.listenerCount).toBe(0);
      expect(h.events.onStatusChange).toHaveBeenLastCalledWith('idle');
      expect(h.clock.pendingCount).toBe(0);

      // A late answer for the stopped session is ignored.
      h.currentWorker()?.replyLatest({ status: 'pass', decodedData: 'STALE' });
      expect(h.events.onScanSuccess).not.toHaveBeenCalled();

      h.engine.start();
      await h.step(16);
      h.currentWorker()?.replyLatest({ status: 'pass', decodedData: 'FRESH' });
      expect(h.events.onScanSuccess).toHaveBeenCalledWith('FRESH');
      expect(h.workers).toHaveLength(1);
    });

    it('survives rapid start/stop cycles without leaking timers, listeners or workers', async () => {
      const h = createHarness();
      h.source.srcObject = null;
      h.source.src = 'blob:recording';
      for (let i = 0; i < 20; i++) {
        h.engine.start();
        await h.step(i % 3);
        h.engine.stop();
      }
      expect(h.clock.pendingCount).toBe(0);
      expect(h.source.listenerCount).toBe(0);
      expect(h.workers).toHaveLength(1);

      h.engine.destroy();
      expect(h.workers[0].released).toBe(true);
      expect(h.workers[0].terminated).toBe(false);
    });

    it('destroy releases the worker, silences events and ignores later starts', async () => {
      const h = createHarness();
      h.engine.start();
      await h.step(16);
      const worker = h.currentWorker();

      h.engine.destroy();
      expect(worker?.attached).toBe(false);
      expect(h.clock.pendingCount).toBe(0);

      h.engine.start();
      await h.step(100);
      expect(h.workers).toHaveLength(1);
      expect(worker?.frames).toHaveLength(1);
    });

    it('stops notifying a listener after it unsubscribes', async () => {
      const h = createHarness();
      h.unsubscribe();
      h.engine.start();
      await h.step(16);
      h.currentWorker()?.replyLatest({ status: 'pass', decodedData: 'QUIET' });
      expect(h.events.onScanSuccess).not.toHaveBeenCalled();
    });

    it('skips a stream until it has delivered its first frame', async () => {
      const h = createHarness();
      h.source.readyState = 0;
      h.engine.start();
      await h.step(200);
      expect(h.currentWorker()?.frames).toHaveLength(0);

      h.source.readyState = 2;
      await h.step(100);
      expect(h.currentWorker()?.frames).toHaveLength(1);
    });

    it('waits for a source to appear', async () => {
      let available = false;
      const h = createHarness({ getSource: () => (available ? new FakeSource() : null) });
      h.engine.start();
      await h.step(200);
      expect(h.currentWorker()?.frames).toHaveLength(0);

      available = true;
      await h.step(100);
      expect(h.currentWorker()?.frames).toHaveLength(1);
    });
  });

  describe('sessions sharing one worker (#1095)', () => {
    /**
     * Stand-in for the page's shared scanner worker: one stale-frame guard (the real one the
     * worker uses) serves every engine, and every admitted frame is answered after `latencyMs`.
     */
    function createSharedWorker(clock: FakeClock, latencyMs: number) {
      const guard = createStaleFrameGuard();
      const state = { codeVisible: false, posted: 0, stale: 0 };
      const factory: ScannerWorkerFactory = (handlers) => {
        let attached = true;
        return {
          postFrame: (request) => {
            state.posted += 1;
            const admitted = guard.admit(request.epochId, request.sequenceId);
            if (!admitted) state.stale += 1;
            const answer: Partial<ScannerResponse> = !admitted
              ? { status: 'fail', error: 'STALE_FRAME' }
              : state.codeVisible
                ? { status: 'pass', decodedData: 'REOPENED' }
                : { status: 'fail' };
            clock.setTimeout(() => {
              if (attached) handlers.onMessage({ sequenceId: request.sequenceId, epochId: request.epochId, ...answer });
            }, admitted ? latencyMs : 1);
          },
          release: () => {
            attached = false;
          },
          terminate: () => {
            attached = false;
          },
        };
      };
      return { factory, state };
    }

    const grabber: CameraFrameGrabber = {
      grabBitmap: (_source, width, height) => Promise.resolve({ width, height, close: () => {} }),
      grabPixels: (_source, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    };

    async function run(clock: FakeClock, ms: number) {
      for (let elapsed = 0; elapsed < ms; elapsed += 4) {
        clock.advance(4);
        await Promise.resolve();
        await Promise.resolve();
      }
    }

    it('decodes the first frame of a reopened scanner after a long session with no code', async () => {
      const clock = new FakeClock();
      const source = new FakeSource();
      const worker = createSharedWorker(clock, 20);
      const config = { getSource: () => source, clock, grabber, createWorker: worker.factory };

      const first = createCameraScannerEngine(config);
      first.start();
      await run(clock, 20_000);
      expect(worker.state.posted).toBeGreaterThan(200);
      first.destroy();

      worker.state.codeVisible = true;
      const postedBefore = worker.state.posted;
      const second = createCameraScannerEngine(config);
      const onScanSuccess = vi.fn();
      second.subscribe({ onScanSuccess });
      second.start();
      await run(clock, 60);

      expect(onScanSuccess).toHaveBeenCalledWith('REOPENED');
      expect(worker.state.posted - postedBefore).toBe(1);
      expect(worker.state.stale).toBe(0);
      second.destroy();
    });

    it('decodes at once when the same engine is stopped and started again', async () => {
      const clock = new FakeClock();
      const source = new FakeSource();
      const worker = createSharedWorker(clock, 20);
      const engine = createCameraScannerEngine({ getSource: () => source, clock, grabber, createWorker: worker.factory });
      const onScanSuccess = vi.fn();
      engine.subscribe({ onScanSuccess });

      engine.start();
      await run(clock, 5_000);
      engine.stop();
      worker.state.codeVisible = true;
      engine.start();
      await run(clock, 60);

      expect(onScanSuccess).toHaveBeenCalledTimes(1);
      expect(worker.state.stale).toBe(0);
    });
  });
});
