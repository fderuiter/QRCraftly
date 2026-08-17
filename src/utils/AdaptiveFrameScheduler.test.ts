import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoubleBufferPool, AdaptiveFrameScheduler } from './AdaptiveFrameScheduler';

describe('DoubleBufferPool', () => {
  it('should initialize and resize pool correctly', () => {
    const pool = new DoubleBufferPool(10, 10);
    expect(pool.getPoolSize()).toBe(2);

    pool.resize(20, 20);
    expect(pool.getPoolSize()).toBe(2);

    // Call resize with same dimensions
    pool.resize(20, 20);
    expect(pool.getPoolSize()).toBe(2);
  });

  it('should acquire and release buffers', () => {
    const pool = new DoubleBufferPool(10, 10);
    const buf1 = pool.acquire();
    const buf2 = pool.acquire();
    expect(pool.getPoolSize()).toBe(0);

    const buf3 = pool.acquire(); // Fallback buffer allocation
    expect(buf3.byteLength).toBe(10 * 10 * 4);

    pool.release(buf1);
    expect(pool.getPoolSize()).toBe(1);

    // Release redundant or mismatched buffer
    pool.release(buf1); // duplicate check
    expect(pool.getPoolSize()).toBe(1);

    const badBuf = new ArrayBuffer(5);
    pool.release(badBuf); // size mismatch check
    expect(pool.getPoolSize()).toBe(1);

    pool.clear();
    expect(pool.getPoolSize()).toBe(0);
  });
});

describe('AdaptiveFrameScheduler', () => {
  let mockTime = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    mockTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should handle start, stop, and basic lifecycle', () => {
    const onStatusChange = vi.fn();
    const scheduler = new AdaptiveFrameScheduler({ onStatusChange });

    expect(scheduler.getInFlight()).toBe(false);
    expect(scheduler.getSamplingDelay()).toBe(33);
    expect(scheduler.getLatencyHistory()).toEqual([]);

    scheduler.start();
    expect(scheduler.getWatchdogTimeout()).toBe(1500);

    scheduler.setWatchdogTimeout(2000);
    expect(scheduler.getWatchdogTimeout()).toBe(2000);

    const seqId = scheduler.beginFrame();
    expect(seqId).toBe(1);
    expect(scheduler.getInFlight()).toBe(true);
    expect(onStatusChange).toHaveBeenCalledWith('checking');

    // Attempt concurrent frame request (backpressure)
    const seqId2 = scheduler.beginFrame();
    expect(seqId2).toBeNull();

    scheduler.stop();
    expect(scheduler.getInFlight()).toBe(false);
  });

  it('should end frames and scale sampling delay dynamically', () => {
    const onDelayChange = vi.fn();
    const onLatencyHistoryChange = vi.fn();
    const onScanFail = vi.fn();
    const scheduler = new AdaptiveFrameScheduler({
      minSamplingDelay: 10,
      maxSamplingDelay: 1000,
      onDelayChange,
      onLatencyHistoryChange,
      onScanFail,
    });

    scheduler.start();

    // End frame with stale error
    const seq1 = scheduler.beginFrame();
    scheduler.endFrame(seq1!, 'fail', null, 'STALE_FRAME');
    expect(scheduler.getInFlight()).toBe(false);

    // Fast frame to scale up
    const seq2 = scheduler.beginFrame();
    mockTime += 5; // Simulate 5ms latency
    scheduler.endFrame(seq2!, 'pass', 'data', null);
    expect(scheduler.getInFlight()).toBe(false);
    const prevDelay = scheduler.getSamplingDelay();
    expect(prevDelay).toBeLessThan(33); // Latency < 40ms triggers increase in capture frequency (smaller delay)

    // Normal successful frame (high latency)
    const seq3 = scheduler.beginFrame();
    mockTime += 200; // Simulate 200ms latency
    scheduler.endFrame(seq3!, 'pass', 'data', null);
    expect(scheduler.getSamplingDelay()).toBeGreaterThan(prevDelay); // Latency > 100ms triggers decrease in capture frequency

    // Older out of order frame should be discarded
    const seq4 = scheduler.beginFrame();
    const seq5 = scheduler.beginFrame(true); // force
    const mockRecycled = new ArrayBuffer(0);
    scheduler.endFrame(seq5!, 'pass', 'data', null, mockRecycled);
    scheduler.endFrame(seq4!, 'pass', 'data', null); // Should return early as out-of-order

    // Fail frame with error
    const seqFail = scheduler.beginFrame(true);
    scheduler.endFrame(seqFail!, 'fail', null, 'some_error');
    expect(onScanFail).toHaveBeenCalledWith('some_error');

    // Fail frame with empty error
    const seqFail2 = scheduler.beginFrame(true);
    scheduler.endFrame(seqFail2!, 'fail', null, null);
    expect(onScanFail).toHaveBeenCalledWith(undefined);

    // Shift history by having 4 iterations
    for (let i = 0; i < 4; i++) {
      const seq = scheduler.beginFrame(true);
      scheduler.endFrame(seq!, 'pass', 'data', null);
    }
    expect(scheduler.getLatencyHistory().length).toBe(3);
  });

  it('should handle watchdog checking and triggers', () => {
    const onWatchdogTriggered = vi.fn();
    const scheduler = new AdaptiveFrameScheduler({ onWatchdogTriggered });

    scheduler.start();
    expect(scheduler.checkWatchdog()).toBe(false);

    scheduler.beginFrame();
    mockTime += 2000;

    // On-demand watchdog check
    expect(scheduler.checkWatchdog()).toBe(true);
    expect(onWatchdogTriggered).toHaveBeenCalled();

    // Trigger recovery redundantly (should guard against it)
    scheduler.triggerRecovery(2000);
  });

  it('should trigger watchdog automatically via setInterval', () => {
    const onWatchdogTriggered = vi.fn();
    const scheduler = new AdaptiveFrameScheduler({ onWatchdogTriggered });

    scheduler.start();
    scheduler.beginFrame();

    mockTime += 2000;
    vi.advanceTimersByTime(2000); // Trigger setInterval
    expect(onWatchdogTriggered).toHaveBeenCalled();

    scheduler.stop();
  });
});
