import { useRef, useCallback, useEffect } from 'react';

/**
 * Encapsulates HTMLVideoElement event listener registration, seeking synchronization,
 * and clean detachment for camera and video file playback.
 */
export function useVideoBinding() {
  const listenersAttachedRef = useRef<{
    video: HTMLVideoElement;
    onPause: () => void;
    onSeeked: () => void;
    onPlay: () => void;
    onLoadedData: () => void;
  } | null>(null);

  const detachVideoListeners = useCallback(() => {
    if (listenersAttachedRef.current) {
      const { video, onPause, onSeeked, onPlay, onLoadedData } = listenersAttachedRef.current;
      try {
        video.removeEventListener('pause', onPause);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('playing', onPlay);
        video.removeEventListener('loadeddata', onLoadedData);
      } catch (e) {
        console.error('Failed to detach video listeners:', e);
      }
      listenersAttachedRef.current = null;
    }
  }, []);

  const attachVideoListeners = useCallback(
    (video: HTMLVideoElement, triggerPlay: () => void, captureFrame: (force?: boolean) => void) => {
      if (listenersAttachedRef.current && listenersAttachedRef.current.video === video) {
        return;
      }

      if (listenersAttachedRef.current) {
        detachVideoListeners();
      }

      const onPause = () => {
        captureFrame(true);
      };

      const onSeeked = () => {
        captureFrame(true);
      };

      const onPlay = () => {
        triggerPlay();
      };

      const onLoadedData = () => {
        captureFrame(true);
      };

      video.addEventListener('pause', onPause);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('play', onPlay);
      video.addEventListener('playing', onPlay);
      video.addEventListener('loadeddata', onLoadedData);

      listenersAttachedRef.current = {
        video,
        onPause,
        onSeeked,
        onPlay,
        onLoadedData,
      };
    },
    [detachVideoListeners]
  );

  useEffect(() => {
    return () => {
      detachVideoListeners();
    };
  }, [detachVideoListeners]);

  return {
    attachVideoListeners,
    detachVideoListeners,
  };
}
