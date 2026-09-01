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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('fileReassemblyWorker ArrayBuffer Slicing & Payload Integrity', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let originalPostMessage: typeof globalThis.postMessage;

  beforeEach(async () => {
    vi.resetModules();
    postMessageSpy = vi.fn();
    originalPostMessage = (globalThis as any).postMessage;
    (globalThis as any).postMessage = postMessageSpy;
    (globalThis as any).self = globalThis;
  });

  afterEach(() => {
    if (originalPostMessage) {
      (globalThis as any).postMessage = originalPostMessage;
    } else {
      delete (globalThis as any).postMessage;
    }
    vi.restoreAllMocks();
  });

  async function loadWorkerHandler() {
    // Import worker to attach onmessage event listener
    await import('./fileReassemblyWorker');
    return (globalThis as any).self.onmessage;
  }

  function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function calculateSHA256(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  it('slices output buffer to exact target file size when buffer pre-allocation was larger than file size', async () => {
    const onmessage = await loadWorkerHandler();

    // Original payload of 10 bytes: "HelloWorld"
    const payloadBytes = new TextEncoder().encode('HelloWorld');
    const sha256 = await calculateSHA256(payloadBytes);

    // Initialize with fileSize: 10 bytes
    await onmessage({
      data: {
        type: 'INIT',
        fileSize: 10,
        totalChunks: 2,
        chunkSize: 8,
        fileName: 'hello.txt',
        mimeType: 'text/plain',
        sha256,
      },
    });

    // Chunk 0: "HelloWor" (8 bytes)
    const chunk0 = payloadBytes.subarray(0, 8);
    await onmessage({
      data: {
        type: 'CHUNK',
        index: 0,
        totalChunks: 2,
        base64: bytesToBase64(chunk0),
      },
    });

    // Chunk 1: "ld" (2 bytes)
    const chunk1 = payloadBytes.subarray(8, 10);
    await onmessage({
      data: {
        type: 'CHUNK',
        index: 1,
        totalChunks: 2,
        base64: bytesToBase64(chunk1),
      },
    });

    const completeCall = postMessageSpy.mock.calls.find(call => call[0]?.type === 'COMPLETE');
    expect(completeCall).toBeDefined();
    if (!completeCall) return;

    const { buffer, handshake } = completeCall[0];
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBe(10);

    const reassembled = new Uint8Array(buffer);
    expect(reassembled.length).toBe(10);
    expect(new TextDecoder().decode(reassembled)).toBe('HelloWorld');

    const reassembledHash = await calculateSHA256(reassembled);
    expect(reassembledHash).toBe(sha256);
    expect(handshake.sha256).toBe(sha256);
  });

  it('slices output buffer to exact size when allocated buffer was dynamically expanded', async () => {
    const onmessage = await loadWorkerHandler();

    // Payload of 15 bytes
    const payloadBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const sha256 = await calculateSHA256(payloadBytes);

    // Initialize with initial fileSize estimate of 8 bytes (smaller than actual 15 bytes)
    await onmessage({
      data: {
        type: 'INIT',
        fileSize: 8,
        totalChunks: 3,
        chunkSize: 5,
        fileName: 'data.bin',
        mimeType: 'application/octet-stream',
        sha256,
      },
    });

    // Send 3 chunks of 5 bytes each, expanding buffer beyond 8 bytes
    for (let i = 0; i < 3; i++) {
      const chunkBytes = payloadBytes.subarray(i * 5, (i + 1) * 5);
      await onmessage({
        data: {
          type: 'CHUNK',
          index: i,
          totalChunks: 3,
          chunkSize: 5,
          base64: bytesToBase64(chunkBytes),
        },
      });
    }

    const completeCall = postMessageSpy.mock.calls.find(call => call[0]?.type === 'COMPLETE');
    expect(completeCall).toBeDefined();

    const { buffer } = completeCall![0];
    expect(buffer.byteLength).toBe(15);

    const reassembled = new Uint8Array(buffer);
    const reassembledHash = await calculateSHA256(reassembled);
    expect(reassembledHash).toBe(sha256);
  });

  it('correctly handles out-of-order chunk arrival and trims trailing bytes', async () => {
    const onmessage = await loadWorkerHandler();

    const payloadBytes = new TextEncoder().encode('Out-of-order reassembly test payload!');
    const targetSize = payloadBytes.length; // 37 bytes
    const sha256 = await calculateSHA256(payloadBytes);

    await onmessage({
      data: {
        type: 'INIT',
        fileSize: targetSize,
        totalChunks: 4,
        chunkSize: 10,
        fileName: 'unordered.txt',
        mimeType: 'text/plain',
        sha256,
      },
    });

    const chunks = [
      { index: 0, bytes: payloadBytes.subarray(0, 10) },
      { index: 1, bytes: payloadBytes.subarray(10, 20) },
      { index: 2, bytes: payloadBytes.subarray(20, 30) },
      { index: 3, bytes: payloadBytes.subarray(30, 37) },
    ];

    // Deliver chunks in scrambled order: 2, 0, 3, 1
    const scrambledOrder = [2, 0, 3, 1];

    for (const idx of scrambledOrder) {
      const c = chunks[idx];
      await onmessage({
        data: {
          type: 'CHUNK',
          index: c.index,
          totalChunks: 4,
          chunkSize: 10,
          base64: bytesToBase64(c.bytes),
        },
      });
    }

    const completeCall = postMessageSpy.mock.calls.find(call => call[0]?.type === 'COMPLETE');
    expect(completeCall).toBeDefined();

    const { buffer } = completeCall![0];
    expect(buffer.byteLength).toBe(targetSize);

    const reassembled = new Uint8Array(buffer);
    expect(new TextDecoder().decode(reassembled)).toBe('Out-of-order reassembly test payload!');

    const reassembledHash = await calculateSHA256(reassembled);
    expect(reassembledHash).toBe(sha256);
  });

  it('resets state correctly upon CLEAR or RESET message', async () => {
    const onmessage = await loadWorkerHandler();

    await onmessage({
      data: {
        type: 'INIT',
        fileSize: 100,
        totalChunks: 5,
      },
    });

    await onmessage({
      data: {
        type: 'CLEAR',
      },
    });

    // After reset, sending chunk without init shouldn't throw crash
    await onmessage({
      data: {
        type: 'CHUNK',
        index: 0,
        totalChunks: 1,
        base64: bytesToBase64(new Uint8Array([65, 66, 67])),
      },
    });

    const completeCall = postMessageSpy.mock.calls.find(call => call[0]?.type === 'COMPLETE');
    expect(completeCall).toBeDefined();
    expect(completeCall?.[0]).toBeDefined();

    expect(completeCall![0].buffer.byteLength).toBe(3);
  });
});
