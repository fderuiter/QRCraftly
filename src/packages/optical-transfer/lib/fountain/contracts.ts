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
 * Self-describing metadata carried by every rateless fountain droplet.
 * Mirrors the BC-UR multipart fragment header (BCR-2020-005):
 * `[seqNum, seqLen, messageLen, checksum, data]`.
 */
export interface DropletMetadata {
  /** Droplet sequence number (1-based). The first `k` droplets are systematic. */
  seq: number;
  /** Total number of source blocks (BC-UR `seqLen`, often called K). */
  k: number;
  /** Byte length of the fountain-encoded message (BC-UR `messageLen`). */
  messageLength: number;
  /** CRC-32 of the complete message (BC-UR `checksum`); binds droplets to one session. */
  checksum: number;
}

/**
 * A rateless fountain droplet emitted over the optical erasure channel.
 */
export interface FountainDroplet extends DropletMetadata {
  /** Indices of the source blocks XOR-combined in this droplet. */
  indices: number[];
  /** Degree of the droplet (number of combined source blocks). */
  degree: number;
  /** The XOR-combined payload bytes (always exactly one block long). */
  data: Uint8Array;
}

/**
 * Options for fountain encoding.
 */
export interface FountainEncoderOptions {
  /** Symbol (block) size in bytes. Defaults to 64. */
  blockSize?: number;
  /** Tuning parameter c for Robust Soliton. Defaults to 0.1. */
  c?: number;
  /** Failure probability delta for Robust Soliton. Defaults to 0.05. */
  delta?: number;
  /**
   * Highest sequence number emitted before the stream wraps back to the first
   * repair droplet (`k + 1`). Bounds the header width so the QR version stays
   * constant for the whole session. Defaults to `max(16 * k, 9999)`.
   */
  maxSeq?: number;
}
