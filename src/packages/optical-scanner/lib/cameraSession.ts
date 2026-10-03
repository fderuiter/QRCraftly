/**
 * Camera Session: the one owner of a live camera for scanning (#1097).
 *
 * A session acquires the camera stream, attaches it to the video element, starts the frame loop
 * (the Camera Scanner Engine) and undoes all of that on `stop()`. Both calls are idempotent and
 * safe in any order, so React effects that run twice (StrictMode, fast remounts) cannot leave the
 * viewfinder black or a camera running:
 *
 * - `start()` while a request is pending or the camera is streaming does nothing;
 * - a `start()` superseded by `stop()` (or by a newer `start()`) releases its stream as soon as
 *   `getUserMedia` resolves;
 * - `stop()` stops every track, detaches the element and stops the loop.
 *
 * The session also releases the camera while the page is hidden and re-acquires it when the page
 * is shown again, so the camera light never stays on in a background tab.
 */

/** Camera state as the UI shows it. */
export type CameraSessionState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'streaming' }
  | { status: 'denied'; error: Error }
  | { status: 'unavailable'; error: Error }
  | { status: 'error'; error: Error };

/** The parts of `HTMLVideoElement` the session drives. */
export interface CameraVideoElement {
  srcObject: MediaProvider | null;
  play(): Promise<void> | void;
  pause(): void;
}

/** The parts of `document` the session watches. */
export interface CameraVisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/** The frame loop the session runs while the camera streams. */
export interface CameraFrameLoop {
  start(): void;
  stop(): void;
}

export interface CameraSessionStartOptions {
  /** A specific camera; defaults to the rear-facing one. */
  deviceId?: string;
}

export interface CameraSessionConfig {
  /** Returns the element to show the camera in, read when the stream arrives. */
  getVideo: () => CameraVideoElement | null | undefined;
  /** The frame loop to run while streaming. */
  loop: CameraFrameLoop;
  /** Defaults to `navigator.mediaDevices`; null when the browser has no camera API. */
  mediaDevices?: Pick<MediaDevices, 'getUserMedia'> | null;
  /** Defaults to `document`; null disables releasing the camera in background tabs. */
  visibility?: CameraVisibilitySource | null;
}

export interface CameraSession {
  /** Acquires the camera (if not already) and starts scanning. Resolves once settled. */
  start(options?: CameraSessionStartOptions): Promise<void>;
  /** Releases the camera and stops scanning. An error state is kept so the UI can explain it. */
  stop(): void;
  getState(): CameraSessionState;
  /** Calls `listener` on every state change; returns a function that removes it. */
  subscribe(listener: (state: CameraSessionState) => void): () => void;
  /** Stops the session for good and drops its listeners. */
  destroy(): void;
}

const IDLE: CameraSessionState = { status: 'idle' };

function toError(caught: unknown): Error {
  if (caught instanceof Error) return caught;
  if (typeof caught === 'object' && caught !== null && 'name' in caught && 'message' in caught) {
    const error = new Error(String(caught.message));
    error.name = String(caught.name);
    return error;
  }
  return new Error(String(caught));
}

/** Maps a `getUserMedia` rejection to the state the UI explains. */
function failureState(caught: unknown): CameraSessionState {
  const error = toError(caught);
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return { status: 'denied', error };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return { status: 'unavailable', error };
    default:
      return { status: 'error', error };
  }
}

function defaultMediaDevices(): Pick<MediaDevices, 'getUserMedia'> | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
  return navigator.mediaDevices;
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // The track may already be gone.
    }
  }
}

/**
 * Creates an idle camera session. Nothing touches the camera until `start()`.
 * @param config The video element, frame loop and (for tests) camera and visibility sources.
 */
export function createCameraSession(config: CameraSessionConfig): CameraSession {
  const listeners = new Set<(state: CameraSessionState) => void>();
  const visibility =
    config.visibility === undefined ? (typeof document === 'undefined' ? null : document) : config.visibility;

  let state: CameraSessionState = IDLE;
  /** Bumped by every acquire and release; a request whose generation changed has been superseded. */
  let generation = 0;
  let stream: MediaStream | null = null;
  let attachedTo: CameraVideoElement | null = null;
  let pending: Promise<void> | null = null;
  /** The user wants the camera (start called and not stopped since). */
  let wanted = false;
  let lastOptions: CameraSessionStartOptions = {};
  let destroyed = false;

  const setState = (next: CameraSessionState) => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener(next);
  };

  function release(): void {
    generation += 1;
    pending = null;
    config.loop.stop();
    const current = stream;
    stream = null;
    if (current) stopTracks(current);
    const video = attachedTo;
    attachedTo = null;
    if (video && (!current || video.srcObject === current)) {
      try {
        video.pause();
        video.srcObject = null;
      } catch {
        // A detached element needs no cleanup.
      }
    }
  }

  async function acquire(options: CameraSessionStartOptions): Promise<void> {
    const ticket = ++generation;
    const mediaDevices = config.mediaDevices === undefined ? defaultMediaDevices() : config.mediaDevices;
    if (!mediaDevices) {
      setState({ status: 'unavailable', error: new Error('Camera API not available on this device or browser.') });
      return;
    }
    setState({ status: 'requesting' });
    let acquired: MediaStream;
    try {
      acquired = await mediaDevices.getUserMedia({
        video: options.deviceId ? { deviceId: { exact: options.deviceId } } : { facingMode: 'environment' },
        audio: false,
      });
    } catch (caught) {
      if (ticket === generation) setState(failureState(caught));
      return;
    }
    if (ticket !== generation || destroyed) {
      // Superseded by stop() or a newer start() while the browser was asking: release at once.
      stopTracks(acquired);
      return;
    }
    const video = config.getVideo();
    if (!video) {
      stopTracks(acquired);
      setState({ status: 'error', error: new Error('No video element to show the camera in.') });
      return;
    }
    stream = acquired;
    attachedTo = video;
    video.srcObject = acquired;
    try {
      const playing = video.play();
      if (playing && typeof playing.catch === 'function') playing.catch(() => {});
    } catch {
      // Autoplay is muted and inline; an interrupted play() is retried by the browser.
    }
    setState({ status: 'streaming' });
    // The engine skips frames until the element has data (readyState >= HAVE_CURRENT_DATA).
    config.loop.start();
  }

  const onVisibilityChange = () => {
    if (!visibility || destroyed || !wanted) return;
    if (visibility.hidden) {
      if (state.status === 'streaming' || state.status === 'requesting') {
        release();
        setState(IDLE);
      }
    } else if (state.status === 'idle') {
      pending = acquire(lastOptions);
    }
  };
  visibility?.addEventListener('visibilitychange', onVisibilityChange);

  return {
    start(options = {}) {
      if (destroyed) return Promise.resolve();
      wanted = true;
      const sameCamera = options.deviceId === lastOptions.deviceId;
      lastOptions = options;
      if (sameCamera && pending && (state.status === 'requesting' || state.status === 'streaming')) return pending;
      if (state.status === 'streaming' || state.status === 'requesting') release();
      if (visibility?.hidden) {
        // Acquired when the page is shown.
        setState(IDLE);
        return Promise.resolve();
      }
      pending = acquire(options);
      return pending;
    },
    stop() {
      wanted = false;
      release();
      if (state.status === 'requesting' || state.status === 'streaming') setState(IDLE);
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      if (destroyed) return;
      wanted = false;
      release();
      destroyed = true;
      visibility?.removeEventListener('visibilitychange', onVisibilityChange);
      listeners.clear();
    },
  };
}
