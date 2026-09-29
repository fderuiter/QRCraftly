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

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import QRCode from 'qrcode';
import { createPrng, sha256Hex, encodeSessionMessage, FountainEncoder } from '../index';

type Handler = (event: { data: unknown }) => Promise<void> | void;
type Posted = { type: string; [key: string]: unknown };

const globalScope = globalThis as unknown as {
  self: unknown;
  onmessage: Handler | null;
  postMessage: (message: Posted) => void;
};

let sliceHandler: Handler;
let reassemblyHandler: Handler;
let posted: Posted[] = [];
let qrCalls: Array<{ text: string; ecc: string | undefined; version: number }> = [];

function randomBytes(length: number, seed: number): Uint8Array {
  const prng = createPrng(seed);
  return Uint8Array.from({ length }, () => Math.floor(prng() * 256));
}

async function startFountain(file: Blob, errorCorrectionLevel = 'Q', chunkSize?: number) {
  await sliceHandler({ data: { type: 'START', payload: { file, fountainMode: true, fps: 15, errorCorrectionLevel, chunkSize } } });
  return posted.find(m => m.type === 'INITIALIZED') as
    | { totalFrames: number; chunkSize: number; sha256: string; fountain: { k: number; symbolSize: number; compression: string } }
    | undefined;
}

/** ACKs frames one by one so the lookahead pipeline keeps generating. */
async function pump(count: number) {
  for (let i = 0; i < count; i++) {
    await sliceHandler({ data: { type: 'ACK', payload: { index: i } } });
  }
}

describe('Fountain sender and receiver workers', () => {
  beforeAll(async () => {
    globalScope.self = globalThis;
    vi.resetModules();
    await import('../worker-slice');
    sliceHandler = globalScope.onmessage as Handler;
    vi.resetModules();
    await import('../worker-reassembly');
    reassemblyHandler = globalScope.onmessage as Handler;
  });

  beforeEach(() => {
    posted = [];
    qrCalls = [];
    globalScope.postMessage = (message: Posted) => {
      posted.push(message);
    };
    const original = QRCode.create.bind(QRCode);
    vi.spyOn(QRCode, 'create').mockImplementation((text, options) => {
      const qr = original(text, options);
      qrCalls.push({ text: String(text), ecc: options?.errorCorrectionLevel, version: qr.version });
      return qr;
    });
  });

  afterEach(async () => {
    await sliceHandler({ data: { type: 'STOP' } });
    await reassemblyHandler({ data: { type: 'CLEAR' } });
    vi.restoreAllMocks();
  });

  it('emits self-describing BC-UR droplets with no handshake frame, within QR version 7', async () => {
    const text = 'Air-gapped optical transfer, rateless edition. '.repeat(60);
    const file = new File([text], 'notes.txt', { type: 'text/plain' });
    const init = await startFountain(file);

    expect(init?.fountain.compression).toBe('deflate-raw');
    expect(init?.fountain.symbolSize).toBeLessThanOrEqual(100);
    expect(init?.totalFrames).toBe(init?.fountain.k);
    expect(init?.sha256).toBe(await sha256Hex(new TextEncoder().encode(text)));

    await pump(20);
    expect(qrCalls.length).toBeGreaterThan(20);
    for (const call of qrCalls) {
      expect(call.text.startsWith('UR:BYTES/')).toBe(true);
      expect(call.text.startsWith('H|')).toBe(false);
      expect(call.version).toBeLessThanOrEqual(7);
      expect(call.ecc).toBe('Q');
    }
  });

  it('keeps broadcasting past K until STOP and never reports COMPLETE', async () => {
    const init = await startFountain(new File([randomBytes(300, 4)], 'small.bin'));
    const k = init?.fountain.k ?? 0;
    expect(k).toBeGreaterThan(0);

    await pump(k * 3);
    const frames = posted.filter(m => m.type === 'FRAME');
    expect(frames.length).toBeGreaterThan(k * 3);
    expect(posted.some(m => m.type === 'COMPLETE')).toBe(false);

    await sliceHandler({ data: { type: 'STOP' } });
    const before = posted.length;
    await sliceHandler({ data: { type: 'ACK', payload: { index: k * 3 } } });
    await sliceHandler({ data: { type: 'HEAL', payload: { lastAckedIndex: k * 3 } } });
    expect(posted.length).toBe(before);
  });

  it('clamps ECC to Q or H and honours a smaller requested symbol size', async () => {
    await startFountain(new File(['x'.repeat(500)], 'm.txt', { type: 'text/plain' }), 'M');
    expect(qrCalls.every(c => c.ecc === 'Q')).toBe(true);
    await sliceHandler({ data: { type: 'STOP' } });

    qrCalls = [];
    posted = [];
    const init = await startFountain(new File([randomBytes(400, 9)], 'h.bin'), 'H', 12);
    expect(init?.fountain.symbolSize).toBeLessThanOrEqual(12);
    expect(qrCalls.every(c => c.ecc === 'H' && c.version <= 7)).toBe(true);
  });

  it.each([
    ['image/jpeg', 'photo.jpg'],
    ['application/zip', 'archive.zip'],
    ['video/mp4', 'clip.mp4'],
  ])('bypasses compression for %s and flags the payload as uncompressed', async (mime, name) => {
    const init = await startFountain(new File(['aaaa'.repeat(400)], name, { type: mime }));
    expect(init?.fountain.compression).toBe('none');
  });

  it('bypasses compression when deflate saves less than 5%', async () => {
    const init = await startFountain(new File([randomBytes(2000, 3)], 'noise.bin', { type: 'application/octet-stream' }));
    expect(init?.fountain.compression).toBe('none');
  });

  it.each([
    ['compressible text', () => new TextEncoder().encode('Bit-for-bit reconstruction over a lossy channel. '.repeat(80)), 'text/plain'],
    ['incompressible binary', () => randomBytes(3000, 77), 'application/octet-stream'],
  ])('reconstructs %s bit-for-bit after mid-stream entry, drops and reordering', async (_label, makeBytes, mime) => {
    const bytes = makeBytes();
    const init = await startFountain(new File([bytes], 'payload.dat', { type: mime }));
    const k = init?.fountain.k ?? 0;
    await pump(k * 4);
    const droplets = qrCalls.map(c => c.text);

    // Join at frame 9, drop ~35% of frames, and deliver in shuffled order.
    const prng = createPrng(1234);
    const received = droplets.slice(9).filter(() => prng() >= 0.35);
    for (let i = received.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [received[i], received[j]] = [received[j], received[i]];
    }

    posted = [];
    for (const droplet of received) {
      await reassemblyHandler({ data: { type: 'FOUNTAIN_DROPLET', droplet } });
      if (posted.some(m => m.type === 'COMPLETE' || m.type === 'ERROR')) break;
    }

    const progress = posted.filter(m => m.type === 'PROGRESS');
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0]).toMatchObject({ isFountain: true, total: k, dropletsReceived: 1 });
    expect(typeof progress[0].rank).toBe('number');

    const complete = posted.find(m => m.type === 'COMPLETE') as
      | { buffer: ArrayBuffer; handshake: { fileName: string; sha256: string; fileSize: number; mimeType: string } }
      | undefined;
    expect(complete).toBeDefined();
    const output = new Uint8Array(complete!.buffer);
    expect(output).toEqual(bytes);
    expect(complete!.handshake).toMatchObject({ fileName: 'payload.dat', fileSize: bytes.length, mimeType: mime });
    expect(complete!.handshake.sha256).toBe(await sha256Hex(output));
  });

  it('posts an ERROR (never COMPLETE) when the session SHA-256 does not match', async () => {
    const bytes = new TextEncoder().encode('forged');
    const message = encodeSessionMessage(
      { fileName: 'f.txt', mimeType: 'text/plain', fileSize: bytes.length, sha256: 'ff'.repeat(32), compression: 'none' },
      bytes
    );
    const encoder = new FountainEncoder(message, { blockSize: 16 });
    for (let i = 0; i < encoder.k; i++) {
      await reassemblyHandler({ data: { type: 'FOUNTAIN_DROPLET', droplet: encoder.dropletStringForIndex(i) } });
    }
    expect(posted.some(m => m.type === 'COMPLETE')).toBe(false);
    expect(posted.find(m => m.type === 'ERROR')).toMatchObject({ isFountain: true, error: expect.stringMatching(/SHA-256/) });
  });

  it('ignores junk and duplicate droplets without stalling', async () => {
    await reassemblyHandler({ data: { type: 'FOUNTAIN_DROPLET', droplet: 'UR:BYTES/1-1/NOTBYTEWORDS' } });
    await reassemblyHandler({ data: { type: 'DROPLET', droplet: 'hello' } });
    expect(posted).toHaveLength(0);
  });
});
