import { DoubleBufferPool } from './bufferPool';

export interface SchedulerOptions {
  minSamplingDelay?: number;
  maxSamplingDelay?: number;
  onStatusChange?: (status: 'idle' | 'checking' | 'pass' | 'fail') => void;
  onDelayChange?: (delay: number) => void;
  onLatencyHistoryChange?: (history: number[]) => void;
  onScanSuccess?: (data: string) => void;
  onScanFail?: (error?: string) => void;
  onWatchdogTriggered?: (elapsed: number) => void;
}

/**
 * Backpressure-driven adaptive sampling controller.
 * Modulates frame rate based on worker latency and trips recovery upon starvation stalls.
 */
export class AdaptiveFrameScheduler {
  public pool: DoubleBufferPool;
  private minSamplingDelay: number;
  private maxSamplingDelay: number;
  private samplingDelay = 33; // Start at ~30 FPS (33ms)
  private latencyHistory: number[] = [];
  private inFlight = false;
  private inFlightStart: number | null = null;
  private watchdogTimer: any = null;
  private sequenceId = 0;
  private completedSequenceId = 0;
  private startTimeMap = new Map<number, number>();
  private options: SchedulerOptions;
  private watchdogTimeout = 1500;

  // Background tab visibility tracking state
  private isPaused = false;
  private pauseStartTime: number | null = null;
  private handleVisibilityChange: (() => void) | null = null;

  constructor(options: SchedulerOptions = {}) {
    this.options = options;
    this.minSamplingDelay = options.minSamplingDelay ?? 16;
    this.maxSamplingDelay = options.maxSamplingDelay ?? 1000;
    this.pool = new DoubleBufferPool();
  }

  /**
   * Resets and starts the scheduler.
   */
  public start() {
    this.inFlight = false;
    this.inFlightStart = null;
    this.sequenceId = 0;
    this.completedSequenceId = 0;
    this.startTimeMap.clear();
    this.latencyHistory = [];
    this.watchdogTimeout = 1500;
    this.setupVisibilityListener();
    this.startWatchdog();
  }

  /**
   * Stops the scheduler and cleans up.
   */
  public stop() {
    this.stopWatchdog();
    this.removeVisibilityListener();
    this.isPaused = false;
    this.pauseStartTime = null;
    this.inFlight = false;
    this.inFlightStart = null;
    this.startTimeMap.clear();
    this.pool.clear();
  }

  private setupVisibilityListener() {
    this.removeVisibilityListener();

    if (typeof document !== 'undefined') {
      this.handleVisibilityChange = () => {
        if (document.hidden) {
          this.pauseWatchdog();
        } else {
          this.resumeWatchdog();
        }
      };

      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      if (document.hidden) {
        this.pauseWatchdog();
      } else {
        this.isPaused = false;
        this.pauseStartTime = null;
      }
    }
  }

  private removeVisibilityListener() {
    if (typeof document !== 'undefined' && this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.handleVisibilityChange = null;
    }
  }

  private pauseWatchdog() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseStartTime = performance.now();
    }
  }

  private resumeWatchdog() {
    if (this.isPaused && this.pauseStartTime !== null) {
      const now = performance.now();
      const pauseStartTime = this.pauseStartTime;
      const pauseDuration = now - pauseStartTime;

      if (this.inFlightStart !== null) {
        if (this.inFlightStart <= pauseStartTime) {
          this.inFlightStart += pauseDuration;
        } else {
          this.inFlightStart = now;
        }
      }

      for (const [seqId, startTime] of this.startTimeMap.entries()) {
        if (startTime <= pauseStartTime) {
          this.startTimeMap.set(seqId, startTime + pauseDuration);
        } else {
          this.startTimeMap.set(seqId, now);
        }
      }

      this.isPaused = false;
      this.pauseStartTime = null;
    }
  }

  private getShiftedTimestamp(t: number, now = performance.now()): number {
    if (!this.isPaused || this.pauseStartTime === null) {
      return t;
    }
    if (t <= this.pauseStartTime) {
      return t + (now - this.pauseStartTime);
    } else {
      return now;
    }
  }

  /**
   * Begins a new frame processing request.
   * Returns a unique sequence ID, or null if backpressure blocks request.
   */
  public beginFrame(force = false): number | null {
    if (this.inFlight && !force) {
      return null;
    }

    this.sequenceId += 1;
    const seqId = this.sequenceId;

    this.inFlight = true;
    this.inFlightStart = performance.now();
    this.startTimeMap.set(seqId, performance.now());
    this.options.onStatusChange?.('checking');

    return seqId;
  }

  /**
   * Completes a frame request, dynamically adjusting capture intervals and recycling buffers.
   */
  public endFrame(
    sequenceId: number,
    status: 'pass' | 'fail',
    decodedData?: string | null,
    error?: string | null,
    recycledBuffer?: ArrayBuffer
  ) {
    if (recycledBuffer) {
      this.pool.release(recycledBuffer);
    }

    if (error === 'STALE_FRAME') {
      this.startTimeMap.delete(sequenceId);
      if (sequenceId > this.completedSequenceId) {
        this.completedSequenceId = sequenceId;
        this.inFlight = false;
        this.inFlightStart = null;
      }
      return;
    }

    const rawStartTime = this.startTimeMap.get(sequenceId);
    if (rawStartTime !== undefined) {
      this.startTimeMap.delete(sequenceId);
      const endTime = performance.now();
      const startTime = this.isPaused ? this.getShiftedTimestamp(rawStartTime, endTime) : rawStartTime;
      const duration = endTime - startTime;

      if (sequenceId <= this.completedSequenceId) {
        return;
      }
      this.completedSequenceId = sequenceId;

      const updatedHistory = [...this.latencyHistory, duration];
      if (updatedHistory.length > 5) {
        updatedHistory.shift();
      }
      this.latencyHistory = updatedHistory;
      this.options.onLatencyHistoryChange?.(updatedHistory);

      if (status === 'pass') {
        if (decodedData) {
          this.options.onScanSuccess?.(decodedData);
        }
      } else if (status === 'fail') {
        this.options.onScanFail?.(error || undefined);
      }

      // Compute 5-frame median latency
      const sorted = [...updatedHistory].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const medianLatency =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];

      let nextDelay = this.samplingDelay;

      if (medianLatency > 100) {
        nextDelay = Math.min(
          this.maxSamplingDelay,
          Math.max(this.samplingDelay + 50, medianLatency * 1.5)
        );
      } else if (medianLatency < 40) {
        const baselineDelay = 33;
        const targetDelay = Math.max(this.minSamplingDelay, baselineDelay);
        const excess = this.samplingDelay - targetDelay;
        const step = Math.max(10, Math.round(excess * 0.5));
        nextDelay = Math.max(this.minSamplingDelay, this.samplingDelay - step);
      }

      this.samplingDelay = nextDelay;
      this.options.onDelayChange?.(nextDelay);
      this.options.onStatusChange?.(status);

      this.inFlight = false;
      this.inFlightStart = null;
    }
  }

  public setWatchdogTimeout(timeout: number) {
    this.watchdogTimeout = timeout;
  }

  public getWatchdogTimeout(): number {
    return this.watchdogTimeout;
  }

  public checkWatchdog(): boolean {
    if (this.isPaused) {
      return false;
    }
    if (this.inFlight && this.inFlightStart !== null) {
      const elapsed = performance.now() - this.inFlightStart;
      if (elapsed > this.watchdogTimeout) {
        console.warn(`Watchdog: Worker starvation detected (${elapsed.toFixed(0)}ms > ${this.watchdogTimeout}ms). Recreating worker.`);
        this.triggerRecovery(elapsed);
        return true;
      }
    }
    return false;
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (this.isPaused) {
        return;
      }
      if (this.inFlight && this.inFlightStart !== null) {
        const elapsed = performance.now() - this.inFlightStart;
        if (elapsed > this.watchdogTimeout) {
          console.warn(`Watchdog: Worker starvation detected (${elapsed.toFixed(0)}ms > ${this.watchdogTimeout}ms). Recreating worker.`);
          this.triggerRecovery(elapsed);
        }
      }
    }, 100);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public triggerRecovery(elapsed: number, notify = true) {
    if (!this.inFlight) return;
    this.inFlight = false;
    this.inFlightStart = null;
    if (notify) {
      this.options.onWatchdogTriggered?.(elapsed);
    }
  }

  public getSamplingDelay(): number {
    return this.samplingDelay;
  }

  public getLatencyHistory(): number[] {
    return this.latencyHistory;
  }

  public getInFlight(): boolean {
    return this.inFlight;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getInFlightStart(): number | null {
    return this.inFlightStart;
  }

  public getStartTimeMap(): Map<number, number> {
    return new Map(this.startTimeMap);
  }
}

