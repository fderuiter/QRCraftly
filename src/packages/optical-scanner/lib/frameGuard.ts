/**
 * Stale-frame guard for the scanner worker.
 *
 * Camera frames are numbered per scan session: every session (every `start()` of a Camera
 * Scanner Engine) gets a fresh, page-wide unique epoch and numbers its frames from 1 again.
 * The worker is shared by every session in the page (the generator scanner and the file-transfer
 * receiver alike) and outlives them, so staleness is judged per `(epochId, sequenceId)`:
 *
 * - a frame from a newer epoch starts a new session and is always admitted;
 * - a frame from an older epoch belongs to a session that has been replaced and is stale;
 * - within one epoch, a frame older than the newest admitted one is stale.
 *
 * Comparing sequence ids alone (#1095) made a reopened scanner wait until its frame numbers
 * caught up with the previous session's, which took seconds after a long session.
 */
export interface StaleFrameGuard {
  /** Records the frame and returns true when it is current, false when it is stale. */
  admit(epochId: number | undefined, sequenceId: number): boolean;
  /** True while no newer frame (or session) has been admitted since this one. */
  isCurrent(epochId: number | undefined, sequenceId: number): boolean;
}

/**
 * Creates a guard with no session yet.
 * @returns The guard.
 */
export function createStaleFrameGuard(): StaleFrameGuard {
  let latestEpoch = Number.NEGATIVE_INFINITY;
  let latestSequence = Number.NEGATIVE_INFINITY;
  return {
    admit(epochId = 0, sequenceId) {
      if (epochId > latestEpoch) {
        latestEpoch = epochId;
        latestSequence = sequenceId;
        return true;
      }
      if (epochId < latestEpoch || sequenceId < latestSequence) return false;
      latestSequence = sequenceId;
      return true;
    },
    isCurrent(epochId = 0, sequenceId) {
      return epochId === latestEpoch && sequenceId >= latestSequence;
    },
  };
}
