/**
 * Client-Side Zero-Knowledge Encryption Utilities using Web Crypto API (window.crypto.subtle).
 * Encrypts dynamic redirect target URLs locally before dispatching storage requests to backend.
 * Embeds decryption keys inside URL anchor hash fragments (#key=...).
 */

/**
 * Generates a random 256-bit (32-byte) AES-GCM symmetric encryption key and exports it as a 64-character hex string.
 */
export async function generateDecryptionKey(): Promise<string> {
  const cryptoObj = globalThis.crypto || (typeof window !== 'undefined' ? window.crypto : undefined);
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not supported in this environment.");
  }

  const key = await cryptoObj.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const rawKeyBuffer = await cryptoObj.subtle.exportKey("raw", key);
  return bufferToHex(rawKeyBuffer);
}

/**
 * Helper to convert an ArrayBuffer / Uint8Array to a hex string.
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Helper to convert a hex string to a Uint8Array.
 */
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Checks if a string represents an encrypted ciphertext payload.
 */
export function isEncrypted(str?: string | null): boolean {
  if (typeof str !== "string") return false;
  return str.startsWith("enc:v1:");
}

/**
 * Encrypts a plain-text target URL string using AES-GCM with a 256-bit raw hex key.
 * Output format: "enc:v1:<iv_hex>:<ciphertext_hex>"
 */
export async function encryptUrl(plainText: string, keyHex: string): Promise<string> {
  if (!plainText) return "";
  const cryptoObj = globalThis.crypto || (typeof window !== 'undefined' ? window.crypto : undefined);
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not supported in this environment.");
  }

  const keyBuffer = hexToBuffer(keyHex);
  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    keyBuffer.buffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // 12-byte (96-bit) IV is standard for AES-GCM
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plainText);

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    cryptoKey,
    encodedText
  );

  const ivHex = bufferToHex(iv);
  const ciphertextHex = bufferToHex(encryptedBuffer);

  return `enc:v1:${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypts an encrypted ciphertext URL string using AES-GCM with a 256-bit raw hex key.
 * If the string is unencrypted plain text (e.g. legacy records), returns the string as-is.
 */
export async function decryptUrl(encryptedStr: string, keyHex: string): Promise<string> {
  if (!encryptedStr) return "";
  if (!isEncrypted(encryptedStr)) {
    // Return unencrypted URL as fallback for legacy records
    return encryptedStr;
  }

  const cryptoObj = globalThis.crypto || (typeof window !== 'undefined' ? window.crypto : undefined);
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not supported in this environment.");
  }

  const parts = encryptedStr.split(":");
  if (parts.length !== 4 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Invalid encrypted ciphertext format.");
  }

  const ivHex = parts[2];
  const ciphertextHex = parts[3];

  const iv = hexToBuffer(ivHex);
  const ciphertextBuffer = hexToBuffer(ciphertextHex);
  const keyBuffer = hexToBuffer(keyHex);

  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    keyBuffer.buffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  try {
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      cryptoKey,
      ciphertextBuffer.buffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (_err) {
    throw new Error("Decryption failed: Invalid decryption key or corrupted ciphertext payload.", { cause: _err });
  }
}

/**
 * Extracts a 64-character hex decryption key from a URL anchor hash fragment.
 * Supports "#key=<64_hex_chars>", "#<64_hex_chars>", or query params in hash fragment.
 */
export function extractKeyFromHash(hashStr: string): string | null {
  if (!hashStr || typeof hashStr !== "string") return null;
  const hash = hashStr.startsWith("#") ? hashStr.substring(1) : hashStr;
  if (!hash) return null;

  // Try parsing key=... from URLSearchParams
  if (hash.includes("=")) {
    const params = new URLSearchParams(hash);
    const keyParam = params.get("key");
    if (keyParam && /^[a-fA-F0-9]{64}$/.test(keyParam)) {
      return keyParam;
    }
  }

  // Regex check for key=... or direct 64 hex string
  const keyMatch = hash.match(/(?:key=)?([a-fA-F0-9]{64})/);
  if (keyMatch && keyMatch[1]) {
    return keyMatch[1];
  }

  return null;
}
