/* eslint-disable security/detect-object-injection */
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

export interface CachedFrame {
  index: number;
  size: number;
  data: Uint8Array;
}

/**
 * Pre-allocated contiguous memory pool for caching pre-rendered QR code frame matrices.
 * Prevents garbage collection pauses, allocations, and CPU spikes during active animation playback and loop wraps.
 */
export class PreallocatedFramePool {
  private capacity: number;
  private maxModulesPerFrame: number;
  private pool: Uint8Array;
  private frameMap: Map<number, CachedFrame>;

  constructor(initialMaxFrames = 500, maxModulesPerFrame = 200 * 200) {
    this.capacity = initialMaxFrames;
    this.maxModulesPerFrame = maxModulesPerFrame;
    // Single contiguous Uint8Array memory block allocated upfront
    this.pool = new Uint8Array(initialMaxFrames * maxModulesPerFrame);
    this.frameMap = new Map();
  }

  /**
   * Stores a pre-rendered frame matrix in the contiguous memory pool.
   */
  public storeFrame(index: number, size: number, sourceData: Uint8Array): CachedFrame {
    // Dynamically expand contiguous memory buffer if frame count exceeds current capacity
    if (index >= this.capacity) {
      const newCapacity = Math.max(index + 1, this.capacity * 2);
      const newPool = new Uint8Array(newCapacity * this.maxModulesPerFrame);
      newPool.set(this.pool);
      this.pool = newPool;
      this.capacity = newCapacity;
    }

    const offset = index * this.maxModulesPerFrame;
    const len = size * size;
    const frameSlice = this.pool.subarray(offset, offset + len);
    frameSlice.set(sourceData.subarray(0, len));

    const cached: CachedFrame = {
      index,
      size,
      data: frameSlice,
    };
    this.frameMap.set(index, cached);
    return cached;
  }

  /**
   * Retrieves a cached frame matrix by index.
   */
  public getFrame(index: number): CachedFrame | undefined {
    return this.frameMap.get(index);
  }

  /**
   * Checks if a frame is cached in the memory pool.
   */
  public hasFrame(index: number): boolean {
    return this.frameMap.has(index);
  }

  /**
   * Returns total number of frames currently stored in the cache.
   */
  public get size(): number {
    return this.frameMap.size;
  }

  /**
   * Deletes a frame mapping by index.
   */
  public delete(index: number): boolean {
    return this.frameMap.delete(index);
  }

  /**
   * Releases a frame mapping by index.
   */
  public releaseFrame(index: number): boolean {
    return this.frameMap.delete(index);
  }

  /**
   * Clears frame mappings while keeping the allocated underlying memory pool intact for reuse.
   */
  public clear(): void {
    this.frameMap.clear();
  }
}

/**
 * Performs an in-place Fisher-Yates shuffle on an array without allocating new array memory.
 */
export function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}
