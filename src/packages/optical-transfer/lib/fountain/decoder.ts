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

import { DropletMetadata } from './contracts';
import { getNeighborsForSeq } from './soliton';
import { computeCrc32Hex, parseDropletString } from './envelope';

interface PendingDroplet {
  neighbors: Set<number>;
  data: Uint8Array;
}

/**
 * Rateless fountain peeling elimination graph solver over GF(2).
 * Enables stateless stream entry where receiving can start at any arbitrary droplet.
 */
export class FountainDecoder {
  public k: number | null = null;
  public fileSize: number | null = null;
  public checksum: string | null = null;
  public blockSize: number | null = null;

  private solvedBlocks: Array<Uint8Array | null> = [];
  private solvedCount: number = 0;
  private pendingDroplets: PendingDroplet[] = [];
  private receivedSeqNumbers: Set<number> = new Set();

  /**
   * Initializes or updates metadata from the first received droplet.
   */
  public init(meta: DropletMetadata, blockSize: number): void {
    if (this.k !== null) return;
    this.k = meta.k;
    this.fileSize = meta.fileSize;
    this.checksum = meta.checksum;
    this.blockSize = blockSize;
    this.solvedBlocks = new Array(this.k).fill(null);
  }

  /**
   * Returns current decoding progress percentage (0 - 100).
   */
  public get progress(): number {
    if (!this.k) return 0;
    return Math.round((this.solvedCount / this.k) * 100);
  }

  /**
   * Returns true if all K source blocks have been resolved.
   */
  public get isComplete(): boolean {
    return this.k !== null && this.solvedCount >= this.k;
  }

  /**
   * Returns the count of solved blocks so far.
   */
  public get resolvedBlockCount(): number {
    return this.solvedCount;
  }

  /**
   * Ingests a raw droplet string (e.g. `ur:bytes/...`).
   * Returns true if the droplet advanced progress or completed the file, false otherwise.
   */
  public ingestString(str: string): boolean {
    const parsed = parseDropletString(str);
    if (!parsed) return false;
    return this.ingest(parsed.meta, parsed.data);
  }

  /**
   * Ingests a parsed droplet symbol into the peeling elimination graph.
   */
  public ingest(meta: DropletMetadata, data: Uint8Array): boolean {
    if (this.isComplete) return false;

    // Reject duplicates of already processed sequence seeds
    if (this.receivedSeqNumbers.has(meta.seq)) {
      return false;
    }
    this.receivedSeqNumbers.add(meta.seq);

    // Initialize solver upon receiving first droplet
    if (this.k === null) {
      this.init(meta, data.length);
    } else if (this.k !== meta.k || this.fileSize !== meta.fileSize || this.checksum !== meta.checksum) {
      // Incompatible session metadata; discard
      return false;
    }

    const k = this.k!;
    const blockSize = this.blockSize!;
    const { indices } = getNeighborsForSeq(meta.seq, k);

    // Copy payload data to allow mutating during peeling
    const dropletPayload = new Uint8Array(blockSize);
    dropletPayload.set(data.subarray(0, blockSize));

    const remainingNeighbors = new Set<number>();

    // 1. XOR out all already-solved blocks
    for (const idx of indices) {
      const solved = this.solvedBlocks[idx];
      if (solved) {
        for (let b = 0; b < blockSize; b++) {
          dropletPayload[b] ^= solved[b];
        }
      } else {
        remainingNeighbors.add(idx);
      }
    }

    // Droplet is already redundant
    if (remainingNeighbors.size === 0) {
      return false;
    }

    // Peeling ripple queue
    const queue: Array<{ index: number; data: Uint8Array }> = [];

    if (remainingNeighbors.size === 1) {
      const singleIdx = remainingNeighbors.values().next().value!;
      queue.push({ index: singleIdx, data: dropletPayload });
    } else {
      this.pendingDroplets.push({
        neighbors: remainingNeighbors,
        data: dropletPayload,
      });
    }

    let madeProgress = false;

    // 2. Cascade peeling elimination ripple
    while (queue.length > 0) {
      const { index, data: blockData } = queue.shift()!;

      if (this.solvedBlocks[index] !== null) {
        continue;
      }

      this.solvedBlocks[index] = blockData;
      this.solvedCount += 1;
      madeProgress = true;

      // Update remaining pending droplets
      const nextPending: PendingDroplet[] = [];

      for (const pending of this.pendingDroplets) {
        if (pending.neighbors.has(index)) {
          // XOR out this newly resolved block
          for (let b = 0; b < blockSize; b++) {
            pending.data[b] ^= blockData[b];
          }
          pending.neighbors.delete(index);

          if (pending.neighbors.size === 1) {
            const nextIdx = pending.neighbors.values().next().value!;
            queue.push({ index: nextIdx, data: pending.data });
          } else if (pending.neighbors.size > 1) {
            nextPending.push(pending);
          }
        } else {
          nextPending.push(pending);
        }
      }

      this.pendingDroplets = nextPending;
    }

    return madeProgress;
  }

  /**
   * Reconstructs the complete original binary once all K blocks are solved.
   * Returns null if reassembly is incomplete or checksum validation fails.
   */
  public finalize(): Uint8Array | null {
    if (!this.isComplete || !this.k || !this.fileSize || !this.blockSize) {
      return null;
    }

    const totalLen = this.k * this.blockSize;
    const fullBuffer = new Uint8Array(totalLen);

    for (let i = 0; i < this.k; i++) {
      const block = this.solvedBlocks[i];
      if (!block) return null;
      fullBuffer.set(block, i * this.blockSize);
    }

    const result = fullBuffer.subarray(0, this.fileSize);

    // Verify CRC32 checksum
    const actualCrc = computeCrc32Hex(result);
    if (actualCrc !== this.checksum) {
      throw new Error(`Fountain integrity error: checksum mismatch (expected ${this.checksum}, got ${actualCrc})`);
    }

    return result;
  }

  /**
   * Resets the decoder state to accept a new stream session.
   */
  public reset(): void {
    this.k = null;
    this.fileSize = null;
    this.checksum = null;
    this.blockSize = null;
    this.solvedBlocks = [];
    this.solvedCount = 0;
    this.pendingDroplets = [];
    this.receivedSeqNumbers.clear();
  }
}

