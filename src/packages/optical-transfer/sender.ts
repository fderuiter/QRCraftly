/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { PreallocatedFramePool, type CachedFrame, shuffleInPlace } from './lib/framePool';
import { sanitizeStreamConfig, verifyHandshakeFrame } from './lib/handshake';
import { SenderSessionOptions, StreamFrame } from './lib/contracts';

export {
  sanitizeStreamConfig,
  verifyHandshakeFrame,
  PreallocatedFramePool,
  type CachedFrame,
  shuffleInPlace,
};

export interface TransferSessionCallbacks {
  onFrame?: (frame: StreamFrame) => void;
  onProgress?: (progress: number, current: number, total: number) => void;
  onError?: (error: string) => void;
  onInitialized?: (totalFrames: number, chunkSize: number, sha256: string) => void;
}

/**
 * Headless transfer session encapsulating off-thread slicing, frame memory pooling,
 * and rate-paced frame generation decoupled from the DOM.
 */
export class TransferSession {
  public file: Blob;
  public options: SenderSessionOptions;
  public totalFrames: number = 0;
  public currentFrameIndex: number = 0;
  public isRunning: boolean = false;
  public sha256: string = '';

  private worker: Worker | null = null;
  private framePool: PreallocatedFramePool = new PreallocatedFramePool();
  private callbacks: TransferSessionCallbacks;
  private timerId: any = null;
  private fps: number;

  constructor(file: Blob, options: SenderSessionOptions, callbacks: TransferSessionCallbacks = {}) {
    this.file = file;
    this.options = options;
    this.callbacks = callbacks;
    this.fps = options.fps || 15;
  }

  /**
   * Initializes the background worker and begins off-thread slicing and matrix generation.
   */
  public async init(): Promise<void> {
    if (typeof Worker === 'undefined') {
      return;
    }

    const worker = new Worker(new URL('./worker-slice.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const { type, totalFrames: tot, index, total, size, data, sha256, message } = e.data || {};

      if (type === 'INITIALIZED') {
        this.totalFrames = tot;
        this.sha256 = sha256 || '';
        if (this.callbacks.onInitialized) {
          this.callbacks.onInitialized(tot, this.options.chunkSize || 180, this.sha256);
        }
      } else if (type === 'FRAME') {
        this.framePool.storeFrame(index, size, data);
        if (this.callbacks.onProgress) {
          const progress = Math.round(((index + 1) / (total || this.totalFrames || 1)) * 100);
          this.callbacks.onProgress(progress, index + 1, total || this.totalFrames);
        }
      } else if (type === 'ERROR') {
        if (this.callbacks.onError) {
          this.callbacks.onError(message || 'Worker error');
        }
      }
    };

    this.worker = worker;

    worker.postMessage({
      type: 'START',
      payload: {
        file: this.file,
        chunkSize: this.options.chunkSize || 180,
        errorCorrectionLevel: this.options.config.errorCorrectionLevel,
        fps: this.fps,
        fountainMode: !!this.options.fountainMode,
      },
    });
  }

  /**
   * Manually steps to the next frame in the animation sequence.
   * Useful for deterministic testing and manual frame stepping off-DOM.
   */
  public step(): StreamFrame | null {
    const cached = this.framePool.getFrame(this.currentFrameIndex);
    if (!cached) return null;

    const frame: StreamFrame = {
      index: cached.index,
      size: cached.size,
      data: cached.data,
      isHandshake: cached.index === 0 && !this.options.fountainMode,
    };

    if (this.worker) {
      this.worker.postMessage({
        type: 'ACK',
        payload: { index: this.currentFrameIndex },
      });
    }

    if (this.callbacks.onFrame) {
      this.callbacks.onFrame(frame);
    }

    this.framePool.delete(this.currentFrameIndex);

    if (this.totalFrames > 0 && this.currentFrameIndex + 1 >= this.totalFrames) {
      this.currentFrameIndex = 0;
      this.framePool.clear();
      if (this.worker) {
        this.worker.postMessage({
          type: 'START',
          payload: {
            file: this.file,
            chunkSize: this.options.chunkSize || 180,
            errorCorrectionLevel: this.options.config.errorCorrectionLevel,
            fps: this.fps,
            fountainMode: !!this.options.fountainMode,
          },
        });
      }
    } else {
      this.currentFrameIndex += 1;
    }

    return frame;
  }

  /**
   * Starts automatic rate-paced frame playback using the configured FPS.
   */
  public start(fps?: number): void {
    if (fps) this.fps = fps;
    this.stop();
    this.isRunning = true;

    const intervalMs = Math.max(16, Math.floor(1000 / this.fps));
    this.timerId = setInterval(() => {
      this.step();
    }, intervalMs);
  }

  /**
   * Stops frame playback and clears interval timers.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Completely closes and terminates the transfer session.
   */
  public destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
      this.worker.terminate();
      this.worker = null;
    }
    this.framePool.clear();
  }
}

/**
 * Factory helper to create and initialize a headless transfer session.
 */
export async function createTransferSession(
  file: Blob,
  options: SenderSessionOptions,
  callbacks: TransferSessionCallbacks = {}
): Promise<TransferSession> {
  const session = new TransferSession(file, options, callbacks);
  await session.init();
  return session;
}
