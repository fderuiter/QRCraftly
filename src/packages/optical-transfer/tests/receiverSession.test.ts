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
import { ReceiverSession, FountainEncoder } from '../index';

describe('Optical Transfer Receiver Engine', () => {
  it('should autonomously sniff and process rateless fountain streams with stateless stream entry', () => {
    const originalText = 'Stateless optical transfer payload via fountain code';
    const originalBytes = new TextEncoder().encode(originalText);
    const encoder = new FountainEncoder(originalBytes, { blockSize: 30 });

    const onProgress = vi.fn();
    const onSuccess = vi.fn();

    const session = new ReceiverSession({ onProgress, onSuccess });

    // Skip the first 10 droplets (simulating user pointing camera mid-stream)
    for (let i = 0; i < 10; i++) {
      encoder.nextDropletString();
    }

    let iterations = 0;
    while (!session.isComplete && iterations < 100) {
      const dropletStr = encoder.nextDropletString();
      session.ingest(dropletStr);
      iterations++;
    }

    expect(session.isComplete).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    const [reassembled] = onSuccess.mock.calls[0];
    expect(new TextDecoder().decode(reassembled)).toBe(originalText);

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
