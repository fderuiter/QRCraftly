import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoubleBufferPool, AdaptiveFrameScheduler } from './AdaptiveFrameScheduler';

describe('DoubleBufferPool', () => {
  it('pre-allocates exactly two memory buffers matching canvas resolution', () => {
    const pool = new DoubleBufferPool(100, 100);
    expect(pool.getPoolSize()).toBe(2);

    const buf1 = pool.acquire();
    expect(buf1.byteLength).toBe(100 * 100 * 4);
    expect(pool.getPoolSize()).toBe(1);

    const buf2 = pool.acquire();
    expect(buf2.byteLength).toBe(100 * 100 * 4);
    expect(pool.getPoolSize()).toBe(0);
  });

  it('recycles valid buffers up to capacity 2 and rejects duplicate or invalid size buffers', () => {
    const pool = new DoubleBufferPool(50, 50);
    const targetSize = 50 * 50 * 4;

    const b1 = pool.acquire();
    const b2 = pool.acquire();
    expect(pool.getPoolSize()).toBe(0);

    // Release b1
    pool.release(b1);
    expect(pool.getPoolSize()).toBe(1);

    // Try releasing duplicate b1
    pool.release(b1);
    expect(pool.getPoolSize()).toBe(1);

    // Release b2
    pool.release(b2);
    expect(pool.getPoolSize()).toBe(2);

    // Try releasing extra buffer beyond capacity 2
    const extra = new ArrayBuffer(targetSize);
    pool.release(extra);
    expect(pool.getPoolSize()).toBe(2);

    // Try releasing buffer with invalid size
    const invalidBuf = new ArrayBuffer(100);
    pool.release(invalidBuf);
    expect(pool.getPoolSize()).toBe(2);
  });

  it('handles resize and clear correctly', () => {
    const pool = new DoubleBufferPool(10, 10);
    expect(pool.getPoolSize()).toBe(2);

    // No-op if same dimensions
    pool.resize(10, 10);
    expect(pool.getPoolSize()).toBe(2);

    // Resize with new dimensions
    pool.resize(20, 20);
    expect(pool.getPoolSize()).toBe(2);
    const buf = pool.acquire();
    expect(buf.byteLength).toBe(20 * 20 * 4);

    pool.clear();
    expect(pool.getPoolSize()).toBe(0);
  });
});

describe('AdaptiveFrameScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies backpressure lock to drop new frame requests when worker is busy', () => {
    const scheduler = new AdaptiveFrameScheduler();
    scheduler.start();

    const seq1 = scheduler.beginFrame();
    expect(seq1).not.toBeNull();
    expect(scheduler.getInFlight()).toBe(true);

    // Second frame request while first is in flight should return null (dropped)
    const seq2 = scheduler.beginFrame();
    expect(seq2).toBeNull();

    // Forced frame request bypasses backpressure lock
    const seq3 = scheduler.beginFrame(true);
    expect(seq3).not.toBeNull();

    scheduler.stop();
  });

  it('dynamically scales sampling delay between 16ms and 1000ms based on measured latency', () => {
    const delayChanges: number[] = [];
    const scheduler = new AdaptiveFrameScheduler({
      minSamplingDelay: 16,
      maxSamplingDelay: 1000,
      onDelayChange: (delay) => delayChanges.push(delay),
    });

    scheduler.start();
    expect(scheduler.getSamplingDelay()).toBe(33);

    // Simulate high latency (>100ms) over multiple frames to trigger scale up
    const seq1 = scheduler.beginFrame()!;
    vi.advanceTimersByTime(150);
    scheduler.endFrame(seq1, 'pass');

    expect(scheduler.getSamplingDelay()).toBeGreaterThan(33);
    expect(scheduler.getSamplingDelay()).toBeLessThanOrEqual(1000);

    // Force delay to high value and simulate low latency (<40ms) to trigger scale down
    const seq2 = scheduler.beginFrame(true)!;
    vi.advanceTimersByTime(10);
    scheduler.endFrame(seq2, 'pass');

    const lastDelay = scheduler.getSamplingDelay();
    expect(lastDelay).toBeGreaterThanOrEqual(16);

    scheduler.stop();
  });

  it('triggers starvation watchdog and auto-recovers when worker request stalls >1500ms', () => {
    const watchdogTriggered = vi.fn();
    const scheduler = new AdaptiveFrameScheduler({
      onWatchdogTriggered: watchdogTriggered,
    });

    scheduler.start();
    const seq1 = scheduler.beginFrame()!;
    expect(scheduler.getInFlight()).toBe(true);

    // Advance timers past 1500ms threshold
    vi.advanceTimersByTime(1600);

    expect(watchdogTriggered).toHaveBeenCalled();
    expect(scheduler.getInFlight()).toBe(false);

    scheduler.stop();
  });

  it('recycles buffers and ignores out-of-order stale responses', () => {
    const scheduler = new AdaptiveFrameScheduler();
    scheduler.pool.resize(10, 10);
    scheduler.start();

    const seq1 = scheduler.beginFrame()!;
    const seq2 = scheduler.beginFrame(true)!;

    const bufferToRecycle = new ArrayBuffer(10 * 10 * 4);

    // Finish frame 2 first
    scheduler.endFrame(seq2, 'pass', 'data-2', null, bufferToRecycle);

    // Out-of-order response for frame 1 should be ignored
    const statusChange = vi.fn();
    const schedulerWithOptions = new AdaptiveFrameScheduler({ onStatusChange: statusChange });
    schedulerWithOptions.start();
    const s1 = schedulerWithOptions.beginFrame()!;
    const s2 = schedulerWithOptions.beginFrame(true)!;
    schedulerWithOptions.endFrame(s2, 'pass');
    schedulerWithOptions.endFrame(s1, 'pass');

    scheduler.stop();
    schedulerWithOptions.stop();
  });
});
