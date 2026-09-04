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

/**
 * Metadata descriptor for a rateless fountain droplet symbol.
 */
export interface DropletMetadata {
  /** Droplet sequence seed index (1-based). */
  seq: number;
  /** Total number of source blocks (K). */
  k: number;
  /** Total file size in bytes. */
  fileSize: number;
  /** Expected checksum (first 8 chars of SHA-256 or CRC32 hex). */
  checksum: string;
}

/**
 * A rateless fountain droplet emitted over the optical erasure channel.
 */
export interface FountainDroplet extends DropletMetadata {
  /** Indices of the source blocks XOR-combined in this droplet. */
  indices: number[];
  /** Degree of the droplet (number of combined source blocks). */
  degree: number;
  /** The XOR-combined payload bytes. */
  data: Uint8Array;
}

/**
 * Options for fountain encoding.
 */
export interface FountainEncoderOptions {
  /** Target block size in bytes. Defaults to 180. */
  blockSize?: number;
  /** Tuning parameter c for Robust Soliton. Defaults to 0.1. */
  c?: number;
  /** Failure probability delta for Robust Soliton. Defaults to 0.05. */
  delta?: number;
}

