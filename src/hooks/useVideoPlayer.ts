import { useState, useEffect, useCallback } from 'react';

/**
 *
 */
interface UseVideoPlayerProps {
  /**
   *
   */
  totalFrames: number;
  /**
   *
   */
  fps?: number;
}

/**
 *
 */
export interface UseVideoPlayerResult {
  /**
   *
   */
  currentFrameIndex: number;
  /**
   *
   */
  isPlaying: boolean;
  /**
   *
   */
  play: () => void;
  /**
   *
   */
  pause: () => void;
  /**
   *
   */
  togglePlay: () => void;
  /**
   *
   */
  seek: (index: number) => void;
  /**
   *
   */
  stepForward: () => void;
  /**
   *
   */
  stepBackward: () => void;
}

/**
 * Standard video player events hook to sync slider and playback states dynamically.
 * @param root0 - The player options.
 * @param root0.totalFrames - Total frames in the video.
 * @param root0.fps - Playback framerate in frames per second.
 * @returns An object containing playback control functions and state.
 */
export const useVideoPlayer = ({ totalFrames, fps = 24 }: UseVideoPlayerProps): UseVideoPlayerResult => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop playing if there are no frames or only 1 frame
  useEffect(() => {
    if (totalFrames <= 1) {
      setIsPlaying(false);
      setCurrentFrameIndex(0);
    }
  }, [totalFrames]);

  // Keep playback index within bounds if totalFrames shrinks
  useEffect(() => {
    if (currentFrameIndex >= totalFrames && totalFrames > 0) {
      setCurrentFrameIndex(totalFrames - 1);
    }
  }, [currentFrameIndex, totalFrames]);

  // Handle continuous playback loop
  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= totalFrames - 1) {
          return 0; // Loop back to the beginning
        }
        return prev + 1;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, fps]);

  const play = useCallback(() => {
    if (totalFrames > 1) {
      setIsPlaying(true);
    }
  }, [totalFrames]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (totalFrames > 1) {
      setIsPlaying((prev) => !prev);
    }
  }, [totalFrames]);

  const seek = useCallback((index: number) => {
    if (totalFrames > 0) {
      const sanitized = Math.max(0, Math.min(totalFrames - 1, index));
      setCurrentFrameIndex(sanitized);
    }
  }, [totalFrames]);

  const stepForward = useCallback(() => {
    if (totalFrames > 0) {
      setCurrentFrameIndex((prev) => {
        if (prev >= totalFrames - 1) {
          return 0; // Wrap around
        }
        return prev + 1;
      });
    }
  }, [totalFrames]);

  const stepBackward = useCallback(() => {
    if (totalFrames > 0) {
      setCurrentFrameIndex((prev) => {
        if (prev <= 0) {
          return totalFrames - 1; // Wrap around to end
        }
        return prev - 1;
      });
    }
  }, [totalFrames]);

  return {
    currentFrameIndex,
    isPlaying,
    play,
    pause,
    togglePlay,
    seek,
    stepForward,
    stepBackward,
  };
};
