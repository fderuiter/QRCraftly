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

import { DANGEROUS_SCHEMES, decodeHtmlEntities, recursiveDecode } from '@/utils/url';

export { DANGEROUS_SCHEMES, decodeHtmlEntities, recursiveDecode };

/**
 * Configuration options for the StreamLookaheadReceiver.
 */
export interface StreamLookaheadConfig {
  /** Callback triggered when a dangerous protocol is warning-flagged. */
  onWarning?: (message: string) => void;
  /** Callback triggered when the stream session is terminated/closed. */
  onTerminate?: () => void;
  /** Callback triggered when the safe stream successfully completes. */
  onSuccess?: (finalPayload: string) => void;
  /** Stream format mode: either 'text' or 'binary'. Defaults to 'text'. */
  mode?: 'text' | 'binary';
}

/**
 * Persistent receiver class managing stream lookup buffers and incremental validation lookahead.
 */
export class StreamLookaheadReceiver {
  private buffer: string = '';
  private isActive: boolean = true;
  private timeoutId: any = null;
  private timeoutMs: number;

  /**
   * Initializes a new streaming lookahead receiver session.
   * @param config - Optional callback handlers for session events.
   * @param timeoutMs - Duration of inactivity in milliseconds before auto-termination.
   */
  constructor(
    private config: StreamLookaheadConfig = {},
    timeoutMs: number = 30000 // default 30 seconds
  ) {
    this.timeoutMs = timeoutMs;
    this.resetTimeout();
  }

  /**
   * Resets the inactivity timeout clock.
   */
  private resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.isActive && this.timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        this.terminate('Scan session timed out due to inactivity');
      }, this.timeoutMs);
    }
  }

  /**
   * Appends an incoming chunk to the lookup buffer and validates the reassembled stream.
   * If a dangerous protocol split is detected, immediately terminates the session and purges memory.
   * @param chunk - The newly received stream chunk.
   */
  public receive(chunk: string): void {
    if (!this.isActive) {
      throw new Error('Cannot receive chunk on an inactive or terminated stream session.');
    }

    this.resetTimeout();
    this.buffer += chunk;

    const mode = this.config.mode || 'text';
    if (mode === 'binary') {
      return;
    }

    // Perform lookahead validation
    // 1. Decode recursively up to 10 levels deep
    const decoded = recursiveDecode(this.buffer, 10);

    // 2. Strip control chars and spaces to prevent obfuscation/bypass
    const cleaned = decoded
      .replace(/[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g, '')
      .toLowerCase();

    // 3. Match against the dangerous schemes
    const dangerousMatch = DANGEROUS_SCHEMES.find(scheme => cleaned.startsWith(scheme));

    if (dangerousMatch) {
      const detectedProtocol = dangerousMatch;
      this.terminate(`Malicious split protocol detected: ${detectedProtocol}`);
      if (this.config.onWarning) {
        this.config.onWarning(`Dangerous protocol detected and blocked: ${detectedProtocol}`);
      }
      throw new Error(`MaliciousStreamError: Detected dangerous protocol prefix "${detectedProtocol}" split across frames.`);
    }
  }

  /**
   * Retrieves the current persistent lookup buffer contents.
   * @returns The active buffer string.
   */
  public getBuffer(): string {
    return this.buffer;
  }

  /**
   * Checks whether the current scanning receiver is active.
   * @returns True if the session is active, false otherwise.
   */
  public isActiveSession(): boolean {
    return this.isActive;
  }

  /**
   * Closes the session and purges all cached state to prevent memory leaks and allow garbage collection.
   * @param _reason - Explanation description of why the stream was terminated.
   */
  public terminate(_reason: string = 'Scan terminated'): void {
    this.isActive = false;
    this.buffer = '';
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.config.onTerminate) {
      this.config.onTerminate();
    }
  }
}

