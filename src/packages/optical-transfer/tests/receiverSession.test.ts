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

import { describe, it, expect, vi } from 'vitest';
import { ReceiverSession, FountainEncoder, createFountainSession, encodeSessionMessage } from '../index';

describe('Optical Transfer Receiver Engine', () => {
  it('should autonomously sniff and process rateless fountain streams with stateless stream entry', async () => {
    const originalText = 'Stateless optical transfer payload via fountain code. '.repeat(20);
    const originalBytes = new TextEncoder().encode(originalText);
    const { encoder, header } = await createFountainSession(originalBytes, {
      fileName: 'notes.txt',
      mimeType: 'text/plain',
    });

    const onProgress = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    // No handshake required and none ever sent: the droplets are self-describing.
    const session = new ReceiverSession({ onProgress, onSuccess, onError, handshakeRequired: true });

    // Join mid-stream (skip the first 10 droplets) and lose every third frame.
    let index = 10;
    while (!session.isComplete && index < 10 + encoder.k * 4) {
      if (index % 3 !== 0) session.ingest(encoder.dropletStringForIndex(index));
      index++;
    }
    await session.completion;

    expect(session.isComplete).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    const [reassembled, handshake] = onSuccess.mock.calls[0];
    expect(new TextDecoder().decode(reassembled)).toBe(originalText);
    expect(handshake).toMatchObject({ fileName: 'notes.txt', mimeType: 'text/plain', sha256: header.sha256 });
    expect(session.ingest(encoder.dropletStringForIndex(index))).toBe(false);

    session.destroy();
  });

  it('should report an integrity error instead of succeeding when the session hash does not match', async () => {
    const bytes = new TextEncoder().encode('tampered payload');
    const message = encodeSessionMessage(
      { fileName: 'x.bin', mimeType: 'application/octet-stream', fileSize: bytes.length, sha256: '00'.repeat(32), compression: 'none' },
      bytes
    );
    const encoder = new FountainEncoder(message, { blockSize: 16 });
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const session = new ReceiverSession({ onSuccess, onError });
    for (let i = 0; i < encoder.k; i++) session.ingest(encoder.dropletStringForIndex(i));
    await session.completion;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/SHA-256 mismatch/));
    session.destroy();
  });

  it('should autonomously parse and process legacy sequential chunk frames', () => {
    const onProgress = vi.fn();
    const onSuccess = vi.fn();
    const session = new ReceiverSession({ onProgress, onSuccess });

    const handshakeFrame = 'H|test.txt|11|text/plain|dummy-hash';
    const dataFrame0 = 'F|0|2|SGVsbG8g'; // "Hello "
    const dataFrame1 = 'F|1|2|V29ybGQh'; // "World!"

    expect(session.ingest(handshakeFrame)).toBe(true);
    expect(session.handshake?.fileName).toBe('test.txt');

    expect(session.ingest(dataFrame0)).toBe(true);
    expect(session.ingest(dataFrame1)).toBe(true);

    session.destroy();
  });

  it('should trigger security alert when split protocol injection is detected', () => {
    const onSecurityAlert = vi.fn();
    const session = new ReceiverSession({ onSecurityAlert });

    // Ingest handshake
    session.ingest('H|script.txt|50|text/plain|dummy');

    // Ingest dangerous split chunks: "java" + "script:alert(1)"
    session.ingest('F|0|2|amF2YQ=='); // "java"
    session.ingest('F|1|2|c2NyaXB0OmFsZXJ0KDEp'); // "script:alert(1)"

    expect(onSecurityAlert).toHaveBeenCalled();
    session.destroy();
  });
});
