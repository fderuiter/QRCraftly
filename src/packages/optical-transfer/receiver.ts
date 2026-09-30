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
import { FountainReassembler } from './lib/fountain/reassembler';
import { isFountainDropletString } from './lib/fountain/envelope';
import { sha256Hex } from './lib/fountain/session';
import { parseSequentialFrame } from './lib/chunking/sequential';
import { StreamLookaheadReceiver } from './lib/streamLookahead';

/** Messages posted by the reassembly worker. */
interface ReassemblyWorkerMessage {
  type?: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  progress?: number;
  current?: number;
  total?: number;
  buffer?: ArrayBuffer;
  error?: string;
  handshake?: HandshakeInfo | null;
}

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
  /** Resolves once an in-flight fountain finalization (decompress + verify) settles. */
  public completion: Promise<void> = Promise.resolve();
  private fountainReassembler: FountainReassembler | null = null;

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

    worker.onmessage = async (e: MessageEvent<ReassemblyWorkerMessage>) => {
      const message = e.data;
      if (!message) return;

      if (message.type === 'PROGRESS') {
        this.options.onProgress?.(message.progress ?? 0, message.current ?? 0, message.total ?? null);
      } else if (message.type === 'COMPLETE' && message.buffer) {
        await this.complete(new Uint8Array(message.buffer), message.handshake ?? this.handshake);
      } else if (message.type === 'ERROR') {
        this.options.onError?.(message.error || 'Reassembly worker error');
      }
    };

    this.worker = worker;
  }

  /**
   * Verifies the SHA-256 from the handshake or fountain session header before
   * handing the file to `onSuccess`.
   */
  private async complete(data: Uint8Array, handshake: HandshakeInfo | null): Promise<void> {
    this.isComplete = true;
    if (handshake?.sha256) {
      const actual = await sha256Hex(data);
      if (actual !== handshake.sha256.toLowerCase()) {
        this.options.onError?.('Integrity validation failed! SHA-256 mismatch.');
        return;
      }
    }
    this.options.onSuccess?.(data, handshake);
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
      if (!this.fountainReassembler) {
        this.fountainReassembler = new FountainReassembler();
      }
      const reassembler = this.fountainReassembler;
      const snapshot = reassembler.ingest(payload);
      if (!snapshot) return false;
      this.options.onProgress?.(snapshot.progress, snapshot.resolved, snapshot.k);

      if (reassembler.isComplete) {
        this.isComplete = true;
        this.completion = reassembler
          .finalize()
          .then(({ data, header }) => this.complete(data, header))
          .catch((err: unknown) => {
            this.options.onError?.(err instanceof Error ? err.message : 'Fountain reassembly failed');
          });
      }
      return true;
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
      } catch (err: unknown) {
        if (this.options.onSecurityAlert) {
          this.options.onSecurityAlert(err instanceof Error && err.message ? err.message : 'Malicious stream detected');
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
    this.fountainReassembler = null;
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
