/**
 * Camera Session (#1097): one owner for the camera stream, safe under repeated start/stop.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createCameraSession,
  type CameraSessionState,
  type CameraVideoElement,
  type CameraVisibilitySource,
} from '../index';

interface FakeTrack {
  live: boolean;
}

/** A controllable `getUserMedia`: each request waits until granted or refused. */
function createFakeCamera() {
  const tracks: FakeTrack[] = [];
  const requests: Array<{
    constraints: MediaStreamConstraints;
    grant: () => void;
    refuse: (name: string) => void;
  }> = [];
  const getUserMedia = (constraints?: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      requests.push({
        constraints: constraints ?? {},
        grant: () => {
          const track: FakeTrack = { live: true };
          tracks.push(track);
          const stream: Pick<MediaStream, 'getTracks'> = {
            getTracks: () => [{ stop: () => { track.live = false; } } as unknown as MediaStreamTrack],
          };
          resolve(stream as MediaStream);
        },
        refuse: (name) => reject(new DOMException('Camera refused', name)),
      });
    });
  return {
    mediaDevices: { getUserMedia },
    requests,
    live: () => tracks.filter((track) => track.live).length,
  };
}

function createFakeVideo() {
  const srcObject: MediaProvider | null = null;
  return { srcObject, play: vi.fn(async () => {}), pause: vi.fn(() => {}) } satisfies CameraVideoElement;
}

function createFakeVisibility() {
  const listeners = new Set<() => void>();
  const source: CameraVisibilitySource & { hidden: boolean; set(hidden: boolean): void; count(): number } = {
    hidden: false,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    set(hidden) {
      this.hidden = hidden;
      for (const listener of [...listeners]) listener();
    },
    count: () => listeners.size,
  };
  return source;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createCameraSession', () => {
  let camera: ReturnType<typeof createFakeCamera>;
  let video: ReturnType<typeof createFakeVideo>;
  let visibility: ReturnType<typeof createFakeVisibility>;
  let loop: { start: Mock<() => void>; stop: Mock<() => void> };
  let states: CameraSessionState['status'][];

  const create = (overrides: Partial<Parameters<typeof createCameraSession>[0]> = {}) => {
    const session = createCameraSession({
      getVideo: () => video,
      loop,
      mediaDevices: camera.mediaDevices,
      visibility,
      ...overrides,
    });
    session.subscribe((state) => states.push(state.status));
    return session;
  };

  beforeEach(() => {
    camera = createFakeCamera();
    video = createFakeVideo();
    visibility = createFakeVisibility();
    loop = { start: vi.fn<() => void>(), stop: vi.fn<() => void>() };
    states = [];
  });

  it('acquires the rear camera, attaches it, plays it and starts the frame loop', async () => {
    const session = create();
    const started = session.start();
    expect(session.getState()).toEqual({ status: 'requesting' });
    expect(camera.requests[0].constraints).toEqual({ video: { facingMode: 'environment' }, audio: false });

    camera.requests[0].grant();
    await started;
    expect(session.getState()).toEqual({ status: 'streaming' });
    expect(video.srcObject).not.toBeNull();
    expect(video.play).toHaveBeenCalled();
    expect(loop.start).toHaveBeenCalledTimes(1);
    expect(camera.live()).toBe(1);
    expect(states).toEqual(['requesting', 'streaming']);
  });

  it('asks for a specific camera by device id', () => {
    create().start({ deviceId: 'front' });
    expect(camera.requests[0].constraints).toEqual({ video: { deviceId: { exact: 'front' } }, audio: false });
  });

  it('is idempotent: start while requesting or streaming asks only once', async () => {
    const session = create();
    const first = session.start();
    const second = session.start();
    expect(second).toBe(first);
    camera.requests[0].grant();
    await first;
    await session.start();
    expect(camera.requests).toHaveLength(1);
    expect(loop.start).toHaveBeenCalledTimes(1);
  });

  it('releases a stream that arrives after stop (StrictMode start, stop, start)', async () => {
    const session = create();
    void session.start();
    session.stop();
    void session.start();
    expect(camera.requests).toHaveLength(2);

    // The browser answers the superseded request last.
    camera.requests[1].grant();
    camera.requests[0].grant();
    await flush();
    expect(camera.live()).toBe(1);
    expect(session.getState()).toEqual({ status: 'streaming' });
    expect(loop.start).toHaveBeenCalledTimes(1);
  });

  it('stops every track, detaches the element and stops the loop', async () => {
    const session = create();
    const started = session.start();
    camera.requests[0].grant();
    await started;

    session.stop();
    expect(camera.live()).toBe(0);
    expect(video.srcObject).toBeNull();
    expect(video.pause).toHaveBeenCalled();
    expect(loop.stop).toHaveBeenCalled();
    expect(session.getState()).toEqual({ status: 'idle' });
    session.stop();
    expect(session.getState()).toEqual({ status: 'idle' });
  });

  it.each([
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'unavailable'],
    ['OverconstrainedError', 'unavailable'],
    ['NotReadableError', 'error'],
  ])('maps a %s refusal to %s and keeps it after stop', async (name, status) => {
    const session = create();
    const started = session.start();
    camera.requests[0].refuse(name);
    await started;
    const state = session.getState();
    expect(state.status).toBe(status);
    expect('error' in state && state.error.name).toBe(name);
    expect(loop.start).not.toHaveBeenCalled();

    session.stop();
    expect(session.getState().status).toBe(status);
  });

  it('retries after a refusal', async () => {
    const session = create();
    const refused = session.start();
    camera.requests[0].refuse('NotAllowedError');
    await refused;
    const retried = session.start();
    camera.requests[1].grant();
    await retried;
    expect(session.getState()).toEqual({ status: 'streaming' });
  });

  it('reports a browser without a camera API as unavailable', async () => {
    const session = create({ mediaDevices: null });
    await session.start();
    expect(session.getState().status).toBe('unavailable');
  });

  it('releases a stream when there is no element to show it in', async () => {
    const session = create({ getVideo: () => null });
    const started = session.start();
    camera.requests[0].grant();
    await started;
    expect(camera.live()).toBe(0);
    expect(session.getState().status).toBe('error');
  });

  it('releases the camera while the page is hidden and reacquires it when shown', async () => {
    const session = create();
    const started = session.start();
    camera.requests[0].grant();
    await started;

    visibility.set(true);
    expect(camera.live()).toBe(0);
    expect(loop.stop).toHaveBeenCalled();
    expect(session.getState()).toEqual({ status: 'idle' });

    visibility.set(false);
    expect(session.getState()).toEqual({ status: 'requesting' });
    camera.requests[1].grant();
    await flush();
    expect(camera.live()).toBe(1);
    expect(session.getState()).toEqual({ status: 'streaming' });
  });

  it('does not reopen a camera the user stopped when the page is shown', () => {
    const session = create();
    void session.start();
    session.stop();
    visibility.set(true);
    visibility.set(false);
    expect(camera.requests).toHaveLength(1);
  });

  it('waits for the page to be shown before asking for the camera', () => {
    visibility.hidden = true;
    const session = create();
    void session.start();
    expect(camera.requests).toHaveLength(0);
    visibility.set(false);
    expect(camera.requests).toHaveLength(1);
  });

  it('destroy releases the camera, drops listeners and ignores later calls', async () => {
    const session = create();
    const started = session.start();
    camera.requests[0].grant();
    await started;

    session.destroy();
    expect(camera.live()).toBe(0);
    expect(visibility.count()).toBe(0);
    await session.start();
    expect(camera.requests).toHaveLength(1);
  });
});
