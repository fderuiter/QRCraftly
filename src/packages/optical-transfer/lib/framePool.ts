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
 * Frames are stored in fixed-size slots of one contiguous buffer; a slot is recycled as
 * soon as its frame is deleted, so an unbounded (rateless) stream with a bounded
 * lookahead never grows the pool, and no allocation happens during playback.
 */
export class PreallocatedFramePool {
  private capacity: number;
  private maxModulesPerFrame: number;
  private pool: Uint8Array;
  private frameMap: Map<number, CachedFrame>;
  private slotOf: Map<number, number>;
  private freeSlots: number[];
  private nextUnusedSlot = 0;

  constructor(initialMaxFrames = 500, maxModulesPerFrame = 200 * 200) {
    this.capacity = Math.max(1, initialMaxFrames);
    this.maxModulesPerFrame = maxModulesPerFrame;
    // Single contiguous Uint8Array memory block allocated upfront
    this.pool = new Uint8Array(this.capacity * maxModulesPerFrame);
    this.frameMap = new Map();
    this.slotOf = new Map();
    this.freeSlots = [];
  }

  /**
   * Number of frame slots currently allocated in the contiguous buffer.
   * @returns Slot capacity.
   */
  public get slotCapacity(): number {
    return this.capacity;
  }

  /**
   * Byte length of the contiguous backing buffer.
   * @returns Buffer size in bytes.
   */
  public get byteLength(): number {
    return this.pool.byteLength;
  }

  private acquireSlot(): number {
    const recycled = this.freeSlots.pop();
    if (recycled !== undefined) return recycled;
    if (this.nextUnusedSlot >= this.capacity) {
      // Grow only when every slot is simultaneously live.
      const newCapacity = this.capacity * 2;
      const newPool = new Uint8Array(newCapacity * this.maxModulesPerFrame);
      newPool.set(this.pool);
      this.pool = newPool;
      this.capacity = newCapacity;
      for (const [index, frame] of this.frameMap) {
        const slot = this.slotOf.get(index) ?? 0;
        const offset = slot * this.maxModulesPerFrame;
        frame.data = this.pool.subarray(offset, offset + frame.size * frame.size);
      }
    }
    return this.nextUnusedSlot++;
  }

  /**
   * Stores a pre-rendered frame matrix in the contiguous memory pool.
   * @param index Frame index.
   * @param size Module count per side.
   * @param sourceData Row-major module data (size * size bytes).
   * @returns The cached frame view.
   */
  public storeFrame(index: number, size: number, sourceData: Uint8Array): CachedFrame {
    const len = size * size;
    if (len > this.maxModulesPerFrame) {
      throw new RangeError(`Frame of ${size}x${size} modules exceeds the pool slot size.`);
    }
    let slot = this.slotOf.get(index);
    if (slot === undefined) {
      slot = this.acquireSlot();
      this.slotOf.set(index, slot);
    }
    const offset = slot * this.maxModulesPerFrame;
    const frameSlice = this.pool.subarray(offset, offset + len);
    frameSlice.set(sourceData.subarray(0, len));

    const cached: CachedFrame = { index, size, data: frameSlice };
    this.frameMap.set(index, cached);
    return cached;
  }

  /**
   * Retrieves a cached frame matrix by index.
   * @param index Frame index.
   * @returns The cached frame, if present.
   */
  public getFrame(index: number): CachedFrame | undefined {
    return this.frameMap.get(index);
  }

  /**
   * Checks if a frame is cached in the memory pool.
   * @param index Frame index.
   * @returns Whether the frame is cached.
   */
  public hasFrame(index: number): boolean {
    return this.frameMap.has(index);
  }

  /**
   * Returns total number of frames currently stored in the cache.
   * @returns Live frame count.
   */
  public get size(): number {
    return this.frameMap.size;
  }

  /**
   * Deletes a frame and returns its slot to the free list for reuse.
   * @param index Frame index.
   * @returns True if a frame was removed.
   */
  public delete(index: number): boolean {
    const slot = this.slotOf.get(index);
    if (slot !== undefined) {
      this.slotOf.delete(index);
      this.freeSlots.push(slot);
    }
    return this.frameMap.delete(index);
  }

  /**
   * Releases a frame mapping by index (alias of {@link delete}).
   * @param index Frame index.
   * @returns True if a frame was removed.
   */
  public releaseFrame(index: number): boolean {
    return this.delete(index);
  }

  /**
   * Clears frame mappings while keeping the allocated underlying memory pool intact for reuse.
   */
  public clear(): void {
    this.frameMap.clear();
    this.slotOf.clear();
    this.freeSlots = [];
    this.nextUnusedSlot = 0;
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

