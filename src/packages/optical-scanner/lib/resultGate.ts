/**
 * Multi-frame confirmation for camera results (#1099).
 *
 * A camera scan accepts a code only once two decodes within {@link ResultGateOptions.windowMs}
 * agree, so a rare misread on one frame is never acted on. The native detector is trusted on one
 * frame. In continuous mode the same payload is not emitted again until the hold period has passed,
 * however many frames keep reading it.
 */
import type { ScanDecoder } from './contracts';

export interface ResultGateOptions {
  /** Agreeing decodes needed before a non-native result is accepted: 1 or 2 (default 2). */
  confirmations?: 1 | 2;
  /** How close together the agreeing decodes must be, in milliseconds (default 500). */
  windowMs?: number;
  /** How long an emitted payload is not emitted again, in milliseconds (default 3000; 0 = never held). */
  holdMs?: number;
}

export interface ResultGate {
  /**
   * Offers a decode at time `now`.
   * @returns Whether to emit it.
   */
  offer(text: string, decoder: ScanDecoder, now: number): boolean;
  /** Forgets candidates and held payloads (a new scan session). */
  reset(): void;
}

export const DEFAULT_CONFIRM_WINDOW_MS = 500;
export const DEFAULT_REPEAT_HOLD_MS = 3000;

/**
 * Creates a result gate.
 * @param options Confirmations, window and hold.
 */
export function createResultGate(options: ResultGateOptions = {}): ResultGate {
  const confirmations = options.confirmations ?? 2;
  const windowMs = options.windowMs ?? DEFAULT_CONFIRM_WINDOW_MS;
  const holdMs = options.holdMs ?? DEFAULT_REPEAT_HOLD_MS;

  let candidate: { text: string; at: number } | null = null;
  const emittedAt = new Map<string, number>();

  return {
    offer(text, decoder, now) {
      const confirmed =
        confirmations === 1 ||
        decoder === 'native' ||
        (candidate !== null && candidate.text === text && now - candidate.at <= windowMs);
      candidate = { text, at: now };
      if (!confirmed) return false;

      if (holdMs > 0) {
        const last = emittedAt.get(text);
        if (last !== undefined && now - last < holdMs) return false;
        for (const [payload, at] of emittedAt) {
          if (now - at >= holdMs) emittedAt.delete(payload);
        }
        emittedAt.set(text, now);
      }
      return true;
    },
    reset() {
      candidate = null;
      emittedAt.clear();
    },
  };
}
