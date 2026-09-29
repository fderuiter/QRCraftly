/**
 * Injectable time source for the Camera Scanner Engine and the Adaptive Frame Scheduler.
 *
 * Production code uses `systemClock`, which reads `performance.now()` and schedules through the
 * browser timers at call time. Headless tests pass a fake clock and step time by hand, so no
 * environment sniffing or global test hooks are needed in the scanning pipeline.
 */
export interface ScannerClock {
  /** Monotonic time in milliseconds. */
  now(): number;
  /** Schedules `callback` after `ms` milliseconds and returns a cancellable handle. */
  setTimeout(callback: () => void, ms: number): number;
  /** Cancels a handle returned by `setTimeout`. */
  clearTimeout(handle: number): void;
  /** Schedules `callback` on the next display frame (paused by the browser in background tabs). */
  requestFrame(callback: () => void): number;
  /** Cancels a handle returned by `requestFrame`. */
  cancelFrame(handle: number): void;
}

const FALLBACK_FRAME_MS = 16;

/**
 * Wall-clock implementation backed by `performance.now()`, `setTimeout` and `requestAnimationFrame`.
 */
export const systemClock: ScannerClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimeout: (callback, ms) => Number(globalThis.setTimeout(callback, ms)),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
  requestFrame: (callback) =>
    typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame(() => callback())
      : Number(globalThis.setTimeout(callback, FALLBACK_FRAME_MS)),
  cancelFrame: (handle) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(handle);
      }
    } else {
      globalThis.clearTimeout(handle);
    }
  },
};
