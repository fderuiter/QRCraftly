/**
 * Stateful Incremental Stream Lookahead processor
 * Reassembles streaming QR code inputs and validates them in real-time
 * to prevent multi-frame protocol injection attacks.
 */

/**
 * Registry of eleven dangerous protocol schemes that are blocked on stream lookahead.
 */
export const DANGEROUS_SCHEMES = [
  'javascript:',
  'vbscript:',
  'file:',
  'data:',
  'mk:',
  'blob:',
  'filesystem:',
  'jscript:',
  'wscript:',
  'mocha:',
  'about:',
];

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
}

const NAMED_ENTITIES: Record<string, string> = {
  'colon': ':',
  'tab': '\t',
  'newline': '\n',
  'quot': '"',
  'amp': '&',
  'lt': '<',
  'gt': '>',
};

/**
 * Decodes hexadecimal, decimal, and named HTML entities.
 * @param str - The input string containing HTML entities.
 * @returns The decoded plain text string.
 */
export function decodeHtmlEntities(str: string): string {
  // 1. Hex and Decimal entities (e.g., &#x3a; or &#58; with optional semicolon)
  let result = str.replace(/&#(?:[xX]([0-9a-fA-F]+)|([0-9]+));?/g, (_match, hex, dec) => {
    return String.fromCharCode(hex ? parseInt(hex, 16) : parseInt(dec, 10));
  });

  // 2. Named entities (e.g., &colon; with optional semicolon)
  result = result.replace(/&([a-zA-Z0-9]+);?/g, (match, name) => {
    return NAMED_ENTITIES[name.toLowerCase()] || match;
  });

  return result;
}

/**
 * Recursively decodes percent-encoded characters and HTML entities up to 10 levels deep.
 * @param input - The obfuscated string to decode.
 * @param maxDepth - The maximum recursion depth limit.
 * @returns The recursively decoded plain text string.
 */
export function recursiveDecode(input: string, maxDepth: number = 10): string {
  let prev = '';
  let curr = input;
  let depth = 0;

  while (curr !== prev && depth < maxDepth) {
    prev = curr;

    // Try percent decoding
    try {
      curr = decodeURIComponent(curr);
    } catch {
      // Fallback: decode only valid percent-encoded hex sequences (%HH)
      curr = curr.replace(/%([0-9a-fA-F]{2})/g, (match, hex) => {
        try {
          return decodeURIComponent(match);
        } catch {
          return String.fromCharCode(parseInt(hex, 16));
        }
      });
    }

    // Try HTML entity decoding
    curr = decodeHtmlEntities(curr);
    depth++;
  }

  return curr;
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

    // Perform lookahead validation
    // 1. Decode recursively up to 10 levels deep
    const decoded = recursiveDecode(this.buffer, 10);

    // 2. Strip control chars and spaces to prevent obfuscation/bypass
    // Note: Do not execute native browser URL parsing on incomplete streams.
    const cleaned = decoded
      .replace(/[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g, '')
      .toLowerCase();

    // 3. Match against the 11 dangerous schemes
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
