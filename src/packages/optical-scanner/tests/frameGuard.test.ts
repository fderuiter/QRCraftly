import { describe, it, expect } from 'vitest';
import { createStaleFrameGuard } from '../index';

describe('stale-frame guard', () => {
  it('rejects a frame older than the newest one of the same session', () => {
    const guard = createStaleFrameGuard();
    expect(guard.admit(1, 1)).toBe(true);
    expect(guard.admit(1, 5)).toBe(true);
    expect(guard.admit(1, 3)).toBe(false);
    expect(guard.admit(1, 5)).toBe(true);
    expect(guard.admit(1, 6)).toBe(true);
  });

  it('starts over for a new session, whatever its frame numbers', () => {
    const guard = createStaleFrameGuard();
    for (let sequenceId = 1; sequenceId <= 500; sequenceId++) guard.admit(1, sequenceId);
    expect(guard.admit(2, 1)).toBe(true);
    expect(guard.admit(2, 2)).toBe(true);
  });

  it('rejects frames from a session that has been replaced', () => {
    const guard = createStaleFrameGuard();
    guard.admit(1, 10);
    guard.admit(2, 1);
    expect(guard.admit(1, 11)).toBe(false);
  });

  it('reports whether a frame is still the newest after the worker yields', () => {
    const guard = createStaleFrameGuard();
    guard.admit(3, 1);
    expect(guard.isCurrent(3, 1)).toBe(true);
    guard.admit(3, 2);
    expect(guard.isCurrent(3, 1)).toBe(false);
    guard.admit(4, 1);
    expect(guard.isCurrent(3, 2)).toBe(false);
    expect(guard.isCurrent(4, 1)).toBe(true);
  });

  it('treats frames without an epoch as one legacy session', () => {
    const guard = createStaleFrameGuard();
    expect(guard.admit(undefined, 2)).toBe(true);
    expect(guard.admit(undefined, 1)).toBe(false);
  });
});
