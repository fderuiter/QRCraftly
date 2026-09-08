/**
 * Preallocated double-buffering memory pool for zero-copy frame buffer recycling.
 */

export class DoubleBufferPool {
  private buffers: ArrayBuffer[] = [];
  private width = 0;
  private height = 0;
  private maxBuffers = 4;

  constructor(width = 0, height = 0, maxBuffers = 4) {
    this.maxBuffers = maxBuffers;
    if (width > 0 && height > 0) {
      this.resize(width, height);
    }
  }

  /**
   * Resizes the pool, pre-allocating exactly two buffers of the target size (width * height * 4).
   */
  public resize(width: number, height: number) {
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = width;
    this.height = height;
    this.buffers = [];
    const size = width * height * 4;
    for (let i = 0; i < 2; i++) {
      this.buffers.push(new ArrayBuffer(size));
    }
  }

  /**
   * Acquires a buffer from the pool, allocating a dynamic fallback if the pool is empty.
   */
  public acquire(): ArrayBuffer {
    if (this.buffers.length > 0) {
      return this.buffers.pop()!;
    }
    const targetSize = this.width > 0 && this.height > 0 ? this.width * this.height * 4 : 0;
    return new ArrayBuffer(targetSize);
  }

  /**
   * Releases a recycled buffer back to the pool up to the maximum capacity limit.
   */
  public release(buffer: ArrayBuffer) {
    const targetSize = this.width * this.height * 4;
    if (buffer && buffer.byteLength === targetSize) {
      if (this.buffers.length < this.maxBuffers && !this.buffers.includes(buffer)) {
        this.buffers.push(buffer);
      }
    }
  }

  /**
   * Clears all held buffers.
   */
  public clear() {
    this.buffers = [];
  }

  /**
   * Returns current count of pooled buffers.
   */
  public getPoolSize(): number {
    return this.buffers.length;
  }

  /**
   * Returns maximum allowed pool capacity.
   */
  public getMaxBuffers(): number {
    return this.maxBuffers;
  }
}

export const sharedBufferPool = new DoubleBufferPool();

