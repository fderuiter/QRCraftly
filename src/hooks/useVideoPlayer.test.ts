// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoPlayer } from './useVideoPlayer';

describe('useVideoPlayer hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useVideoPlayer({ totalFrames: 10 }));
    expect(result.current.currentFrameIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('allows playing and loops through frames', () => {
    const { result } = renderHook(() => useVideoPlayer({ totalFrames: 5, fps: 10 }));
    
    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    // Advance 100ms (1 frame at 10fps)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentFrameIndex).toBe(1);

    // Advance 400ms more (reaches index 0 due to looping)
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.currentFrameIndex).toBe(0);
  });

  it('allows pausing', () => {
    const { result } = renderHook(() => useVideoPlayer({ totalFrames: 5, fps: 10 }));
    
    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentFrameIndex).toBe(0);
  });

  it('allows seeking', () => {
    const { result } = renderHook(() => useVideoPlayer({ totalFrames: 10 }));
    
    act(() => {
      result.current.seek(5);
    });
    expect(result.current.currentFrameIndex).toBe(5);

    // Seek out of bounds
    act(() => {
      result.current.seek(15);
    });
    expect(result.current.currentFrameIndex).toBe(9);

    act(() => {
      result.current.seek(-5);
    });
    expect(result.current.currentFrameIndex).toBe(0);
  });

  it('allows stepping forward and backward', () => {
    const { result } = renderHook(() => useVideoPlayer({ totalFrames: 3 }));
    
    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentFrameIndex).toBe(1);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentFrameIndex).toBe(2);

    // Wrap around forward
    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentFrameIndex).toBe(0);

    // Wrap around backward
    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentFrameIndex).toBe(2);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentFrameIndex).toBe(1);
  });
});
