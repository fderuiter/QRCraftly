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

import { describe, it, expect } from 'vitest';
import { FountainEncoder } from '../lib/fountain/encoder';
import { FountainDecoder } from '../lib/fountain/decoder';
import { buildRobustSolitonCdf } from '../lib/fountain/soliton';
import { serializeDroplet, parseDropletString, isFountainDropletString } from '../lib/fountain/envelope';
import {
  FountainEncoder,
  FountainDecoder,
  buildRobustSolitonCdf,
  serializeDroplet,
  parseDropletString,
  isFountainDropletString,
} from '../index';

describe('Luby Transform Rateless Fountain Codec', () => {
  it('should generate a valid monotonic Robust Soliton CDF', () => {
    const cdf = buildRobustSolitonCdf(20, 0.1, 0.05);
    expect(cdf.length).toBe(20);
    expect(cdf[0]).toBeGreaterThan(0);
    expect(cdf[cdf.length - 1]).toBe(1.0);

    for (let i = 1; i < cdf.length; i++) {
      expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i - 1]);
    }
  });

  it('should encode and decode a single-block payload (K = 1)', () => {
    const original = new TextEncoder().encode('Small payload');
    const encoder = new FountainEncoder(original, { blockSize: 100 });
    expect(encoder.k).toBe(1);

    const decoder = new FountainDecoder();
    const dropletStr = encoder.nextDropletString();

    expect(isFountainDropletString(dropletStr)).toBe(true);
    expect(decoder.ingestString(dropletStr)).toBe(true);
    expect(decoder.isComplete).toBe(true);

    const reconstructed = decoder.finalize();
    expect(reconstructed).not.toBeNull();
    expect(new TextDecoder().decode(reconstructed!)).toBe('Small payload');
  });

  it('should decode a multi-block payload without loss in K frames', () => {
    // 500 bytes with block size 50 => K = 10
    const original = new Uint8Array(500);
    for (let i = 0; i < 500; i++) original[i] = (i * 17) % 256;

    const encoder = new FountainEncoder(original, { blockSize: 50 });
    expect(encoder.k).toBe(10);

    const decoder = new FountainDecoder();

    for (let i = 0; i < 10; i++) {
      const droplet = encoder.nextDroplet();
      decoder.ingest(droplet, droplet.data);
    }

    expect(decoder.isComplete).toBe(true);
    const reconstructed = decoder.finalize();
    expect(reconstructed).toEqual(original);
  });

  it('should enable stateless stream entry: recover completely when starting mid-stream', () => {
    // 1200 bytes with block size 60 => K = 20
    const original = new Uint8Array(1200);
    for (let i = 0; i < 1200; i++) original[i] = (i * 31) % 256;

    const encoder = new FountainEncoder(original, { blockSize: 60 });
    const decoder = new FountainDecoder();

    // Skip the first 25 frames completely (stateless entry)
    for (let i = 0; i < 25; i++) {
      encoder.nextDroplet();
    }

    // Now start capturing from seq 26 onwards
    let framesIngested = 0;
    while (!decoder.isComplete && framesIngested < 150) {
      const droplet = encoder.nextDroplet();
      decoder.ingest(droplet, droplet.data);
      framesIngested++;
    }

    expect(decoder.isComplete).toBe(true);
    const reconstructed = decoder.finalize();
    expect(reconstructed).toEqual(original);
  });

  it('should reconstruct payload across an erasure channel with 30% random packet loss', () => {
    // 800 bytes with block size 40 => K = 20
    const original = new Uint8Array(800);
    for (let i = 0; i < 800; i++) original[i] = (i * 7 + 13) % 256;

    const encoder = new FountainEncoder(original, { blockSize: 40 });
    const decoder = new FountainDecoder();

    let transmitted = 0;
    // Simple deterministic pseudo-random drop simulation (drop ~30% of frames)
    while (!decoder.isComplete && transmitted < 200) {
      const dropletStr = encoder.nextDropletString();
      transmitted++;

      // Drop 30% of packets
      if (transmitted % 3 === 0) {
        continue; // packet erasure
      }

      decoder.ingestString(dropletStr);
    }

    expect(decoder.isComplete).toBe(true);
    const reconstructed = decoder.finalize();
    expect(reconstructed).toEqual(original);
  });

  it('should detect checksum tampering and throw on corrupted payload', () => {
    const original = new TextEncoder().encode('Integrity critical document');
    const encoder = new FountainEncoder(original, { blockSize: 32 });
    const decoder = new FountainDecoder();

    const droplet = encoder.nextDroplet();
    // Tamper with droplet payload
    droplet.data[0] ^= 0xff;

    decoder.ingest(droplet, droplet.data);
    expect(() => decoder.finalize()).toThrow(/checksum mismatch/i);
  });

  it('should parse and serialize BC-UR aligned droplet strings cleanly', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const droplet = {
      seq: 42,
      k: 10,
      fileSize: 1024,
      checksum: 'a1b2c3d4',
      degree: 1,
      indices: [3],
      data,
    };

    const str = serializeDroplet(droplet);
    expect(str).toMatch(/^ur:bytes\/42-10-1024-a1b2c3d4\//);

    const parsed = parseDropletString(str);
    expect(parsed).not.toBeNull();
    expect(parsed!.meta.seq).toBe(42);
    expect(parsed!.meta.k).toBe(10);
    expect(parsed!.meta.fileSize).toBe(1024);
    expect(parsed!.meta.checksum).toBe('a1b2c3d4');
    expect(parsed!.data).toEqual(data);
  });
});

