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

import { FountainDroplet, FountainEncoderOptions } from './contracts';
import { buildRobustSolitonCdf, getNeighborsForSeq } from './soliton';
import { computeCrc32Hex, serializeDroplet } from './envelope';

/**
 * Rateless fountain block slicer and Luby Transform encoder over GF(2).
 */
export class FountainEncoder {
  public readonly fileSize: number;
  public readonly blockSize: number;
  public readonly k: number;
  public readonly checksum: string;

  private blocks: Uint8Array[];
  private cdf: Float64Array;
  private currentSeq: number = 0;

  constructor(data: Uint8Array, options: FountainEncoderOptions = {}) {
    this.fileSize = data.length;
    this.blockSize = Math.max(32, options.blockSize ?? 180);
    this.k = Math.max(1, Math.ceil(this.fileSize / this.blockSize));
    this.checksum = computeCrc32Hex(data);
    this.cdf = buildRobustSolitonCdf(this.k, options.c ?? 0.1, options.delta ?? 0.05);

    // Partition source data into K blocks of equal size `blockSize`
    this.blocks = new Array(this.k);
    for (let i = 0; i < this.k; i++) {
      const block = new Uint8Array(this.blockSize);
      const start = i * this.blockSize;
      const end = Math.min(this.fileSize, start + this.blockSize);
      if (start < this.fileSize) {
        block.set(data.subarray(start, end), 0);
      }
      this.blocks[i] = block;
    }
  }

  /**
   * Generates a specific droplet for a sequence number.
   * @param seq Droplet sequence number (1-based integer).
   */
  public getDroplet(seq: number): FountainDroplet {
    const { degree, indices } = getNeighborsForSeq(seq, this.k, this.cdf);
    const dropletData = new Uint8Array(this.blockSize);

    // XOR combine blocks in GF(2)
    for (const idx of indices) {
      const sourceBlock = this.blocks[idx];
      for (let b = 0; b < this.blockSize; b++) {
        dropletData[b] ^= sourceBlock[b];
      }
    }

    return {
      seq,
      k: this.k,
      fileSize: this.fileSize,
      checksum: this.checksum,
      degree,
      indices,
      data: dropletData,
    };
  }

  /**
   * Emits the next sequential droplet in the rateless stream.
   */
  public nextDroplet(): FountainDroplet {
    this.currentSeq += 1;
    return this.getDroplet(this.currentSeq);
  }

  /**
   * Emits the next serialized BC-UR droplet string.
   */
  public nextDropletString(): string {
    return serializeDroplet(this.nextDroplet());
  }

  /**
   * Resets the emission sequence back to 0.
   */
  public reset(): void {
    this.currentSeq = 0;
  }
}

