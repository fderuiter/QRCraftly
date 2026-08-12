import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Representation of the possible camera permission states.
 */
export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

/**
 * Result returned by the useCamera hook.
 */
export interface UseCameraResult {
  /** Reactive state of camera permissions. */
  permissionState: PermissionState;
  /** Active media stream of the webcam. */
  stream: MediaStream | null;
  /** Caught media stream/request error, if any. */
  error: Error | null;
  /** Indicates whether the media stream initialization is in progress. */
  isInitializing: boolean;
  /** Trigger to request and start the webcam media stream. */
  startStream: (signal?: AbortSignal) => Promise<MediaStream | null>;
  /** Trigger to release tracks and stop the active webcam media stream. */
  stopStream: () => void;
}

/**
 * Custom React hook to request and manage browser camera permissions and stream.
 * @returns Camera status and controls.
 */
export function useCamera(): UseCameraResult {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync permission state from navigator.permissions if available
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    const handleStatusChange = () => {
      if (permissionStatus) {
        if (permissionStatus.state === 'granted') {
          setPermissionState('granted');
        } else if (permissionStatus.state === 'denied') {
          setPermissionState('denied');
        } else {
          setPermissionState('prompt');
        }
      }
    };

    navigator.permissions
      .query({ name: 'camera' as any })
      .then((status) => {
        permissionStatus = status;
        handleStatusChange();
        status.addEventListener('change', handleStatusChange);
      })
      .catch(() => {
        // Safe catch for browsers that don't support camera query in permissions API
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handleStatusChange);
      }
    };
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const startStream = useCallback(async (externalSignal?: AbortSignal) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unavailable');
      setError(new Error('Camera API not available on this device/browser.'));
      return null;
    }

    // Stop and cleanup first (this aborts any previous pending request)
    stopStream();

    const internalController = new AbortController();
    abortControllerRef.current = internalController;
    const internalSignal = internalController.signal;

    if (internalSignal.aborted || externalSignal?.aborted) {
      setIsInitializing(false);
      return null;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const activeStream = await new Promise<MediaStream>((resolve, reject) => {
        let aborted = false;

        const handleAbort = () => {
          if (!aborted) {
            aborted = true;
            reject(new DOMException('Camera stream request was aborted', 'AbortError'));
          }
        };

        internalSignal.addEventListener('abort', handleAbort);
        if (externalSignal) {
          externalSignal.addEventListener('abort', handleAbort);
        }

        const cleanup = () => {
          internalSignal.removeEventListener('abort', handleAbort);
          if (externalSignal) {
            externalSignal.removeEventListener('abort', handleAbort);
          }
        };

        getUserMediaPromise.then(
          (stream) => {
            cleanup();
            if (aborted || internalSignal.aborted || externalSignal?.aborted) {
              stream.getTracks().forEach((track) => track.stop());
              reject(new DOMException('Camera stream request was aborted', 'AbortError'));
            } else {
              resolve(stream);
            }
          },
          (err) => {
            cleanup();
            reject(err);
          }
        );
      });

      streamRef.current = activeStream;
      setStream(activeStream);
      setPermissionState('granted');
      setIsInitializing(false);
      return activeStream;
    } catch (err: any) {
      setIsInitializing(false);

      if (err.name === 'AbortError') {
        // Abort must fail silently in the background
        return null;
      }

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      } else {
        setPermissionState('unavailable');
      }
      setError(err);
      return null;
    }
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    permissionState,
    stream,
    error,
    isInitializing,
    startStream,
    stopStream,
  };
}
