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

import { HandshakeInfo, ReceiverSessionOptions } from './lib/contracts';
import { FountainDecoder } from './lib/fountain/decoder';
import { isFountainDropletString } from './lib/fountain/envelope';
import { parseSequentialFrame } from './lib/chunking/sequential';
import { StreamLookaheadReceiver } from './lib/streamLookahead';

/**
 * Headless receiver session managing autonomous protocol sniffing,
 * stream lookahead validation, and off-thread or local reassembly.
 */
export class ReceiverSession {
  public options: ReceiverSessionOptions;
  public handshake: HandshakeInfo | null = null;
  public isComplete: boolean = false;
  public totalChunks: number | null = null;
  public processedIndices: Set<number> = new Set();

  private worker: Worker | null = null;
  private lookahead: StreamLookaheadReceiver;
  private fountainDecoder: FountainDecoder | null = null;

  constructor(options: ReceiverSessionOptions = {}) {
    this.options = options;
    this.lookahead = new StreamLookaheadReceiver({
      mode: options.streamMode || 'text',
      onWarning: msg => {
        if (this.options.onSecurityAlert) this.options.onSecurityAlert(msg);
      },
    });
  }

  /**
   * Initializes the background reassembly worker.
   */
  public init(): void {
    if (typeof Worker === 'undefined') return;

    const worker = new Worker(new URL('./worker-reassembly.ts', import.meta.url), { type: 'module' });

    worker.onmessage = async (e: MessageEvent) => {
      const { type, progress, current, total, buffer, error, handshake: workerHandshake } = e.data || {};

      if (type === 'PROGRESS') {
        if (this.options.onProgress) {
          this.options.onProgress(progress, current, total);
        }
      } else if (type === 'COMPLETE') {
        this.isComplete = true;
        const reassembled = new Uint8Array(buffer);
        const activeHandshake = workerHandshake || this.handshake;

        if (activeHandshake && activeHandshake.sha256) {
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(reassembled));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (actualSHA256 !== activeHandshake.sha256) {
              const err = `Integrity validation failed! SHA-256 mismatch.`;
              if (this.options.onError) this.options.onError(err);
              return;
            }
          }
        }

        if (this.options.onSuccess) {
          this.options.onSuccess(reassembled, activeHandshake);
        }
      } else if (type === 'ERROR') {
        if (this.options.onError) {
          this.options.onError(error || 'Reassembly worker error');
        }
      }
    };

    this.worker = worker;
  }

  /**
   * Ingests a raw decoded QR string from camera or file source.
   * Autonomously sniffs between rateless fountain droplets and legacy sequential chunks.
   */
  public ingest(payload: string): boolean {
    if (this.isComplete) return false;

    // 1. Sniff Rateless Fountain Droplet
    if (isFountainDropletString(payload)) {
      if (this.worker) {
        this.worker.postMessage({
          type: 'FOUNTAIN_DROPLET',
          droplet: payload,
        });
        return true;
      }

      // Main-thread fallback for test or worker-constrained environments
      if (!this.fountainDecoder) {
        this.fountainDecoder = new FountainDecoder();
      }

      const progressed = this.fountainDecoder.ingestString(payload);
      if (progressed) {
        const total = this.fountainDecoder.k || 1;
        const current = this.fountainDecoder.resolvedBlockCount;
        const progress = this.fountainDecoder.progress;

        if (this.options.onProgress) {
          this.options.onProgress(progress, current, total);
        }

        if (this.fountainDecoder.isComplete) {
          this.isComplete = true;
          const finalBuffer = this.fountainDecoder.finalize();
          if (finalBuffer && this.options.onSuccess) {
            this.options.onSuccess(finalBuffer, {
              fileName: `received_file_${Date.now()}.bin`,
              fileSize: finalBuffer.length,
              mimeType: 'application/octet-stream',
              sha256: '',
            });
          }
        }
      }
      return progressed;
    }

    // 2. Legacy Sequential Handshake / Chunk Stream
    const parsed = parseSequentialFrame(payload);
    if (!parsed) return false;

    if (parsed.type === 'HANDSHAKE' && parsed.handshake) {
      this.handshake = parsed.handshake;
      if (this.worker) {
        this.worker.postMessage({
          type: 'INIT',
          fileSize: parsed.handshake.fileSize,
          mimeType: parsed.handshake.mimeType,
          fileName: parsed.handshake.fileName,
          sha256: parsed.handshake.sha256,
        });
      }
      return true;
    }

    if (parsed.type === 'DATA' && parsed.chunk) {
      const { index, total, base64 } = parsed.chunk;
      this.totalChunks = total;

      if (this.processedIndices.has(index)) {
        return false;
      }
      this.processedIndices.add(index);

      let decodedPayload = '';
      try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        decodedPayload = new TextDecoder('utf-8').decode(bytes);
      } catch {
        decodedPayload = '';
      }

      // Security check on payload
      try {
        this.lookahead.receive(decodedPayload);
      } catch (err: any) {
        if (this.options.onSecurityAlert) {
          this.options.onSecurityAlert(err?.message || 'Malicious stream detected');
        }
        return false;
      }

      if (this.worker) {
        this.worker.postMessage({
          type: 'CHUNK',
          index,
          total,
          base64,
        });
      }
      return true;
    }

    return false;
  }

  /**
   * Resets receiver state to prepare for a fresh stream.
   */
  public reset(): void {
    this.handshake = null;
    this.isComplete = false;
    this.totalChunks = null;
    this.processedIndices.clear();
    if (this.fountainDecoder) {
      this.fountainDecoder.reset();
      this.fountainDecoder = null;
    }
    if (this.worker) {
      this.worker.postMessage({ type: 'CLEAR' });
    }
  }

  /**
   * Destroys the receiver session and shuts down background workers.
   */
  public destroy(): void {
    this.reset();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.lookahead.terminate();
  }
}

/**
 * Factory helper to create and initialize a headless receiver session.
 */
export function createReceiverSession(options: ReceiverSessionOptions = {}): ReceiverSession {
  const session = new ReceiverSession(options);
  session.init();
  return session;
}
