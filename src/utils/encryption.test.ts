import { describe, it, expect } from 'vitest';
import {
  generateDecryptionKey,
  encryptUrl,
  decryptUrl,
  isEncrypted,
  extractKeyFromHash,
  bufferToHex,
  hexToBuffer,
} from './encryption';

describe('Zero-Knowledge Client Encryption Utilities', () => {
  it('generates a valid 64-character hex encryption key', async () => {
    const key = await generateDecryptionKey();
    expect(key).toBeDefined();
    expect(key).toHaveLength(64);
    expect(/^[a-fA-F0-9]{64}$/.test(key)).toBe(true);
  });

  it('encrypts and decrypts target URLs symmetrically using Web Crypto API', async () => {
    const key = await generateDecryptionKey();
    const originalUrl = 'https://example.com/secret-target-page?user=123';

    const ciphertext = await encryptUrl(originalUrl, key);
    expect(ciphertext).toBeDefined();
    expect(isEncrypted(ciphertext)).toBe(true);
    expect(ciphertext).toContain('enc:v1:');
    // Ensure plain text destination URL is NOT present in the ciphertext string
    expect(ciphertext.includes(originalUrl)).toBe(false);
    expect(ciphertext.includes('secret-target-page')).toBe(false);

    const decrypted = await decryptUrl(ciphertext, key);
    expect(decrypted).toBe(originalUrl);
  });

  it('fails decryption cleanly when using an incorrect key or corrupted ciphertext', async () => {
    const key1 = await generateDecryptionKey();
    const key2 = await generateDecryptionKey();
    const originalUrl = 'https://confidential-destination.com';

    const ciphertext = await encryptUrl(originalUrl, key1);

    // Attempting decryption with a different key should throw
    await expect(decryptUrl(ciphertext, key2)).rejects.toThrow(
      'Decryption failed: Invalid decryption key or corrupted ciphertext payload.'
    );

    // Corrupting ciphertext string
    const corruptedCiphertext = ciphertext.substring(0, ciphertext.length - 4) + '0000';
    await expect(decryptUrl(corruptedCiphertext, key1)).rejects.toThrow(
      'Decryption failed'
    );
  });

  it('returns unencrypted URLs as fallback for legacy records', async () => {
    const key = await generateDecryptionKey();
    const legacyUrl = 'https://legacy-unencrypted-site.com';

    expect(isEncrypted(legacyUrl)).toBe(false);
    const result = await decryptUrl(legacyUrl, key);
    expect(result).toBe(legacyUrl);
  });

  it('correctly extracts 64-character hex decryption keys from URL hash fragments', () => {
    const key = 'a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123';

    expect(extractKeyFromHash(`#key=${key}`)).toBe(key);
    expect(extractKeyFromHash(`key=${key}`)).toBe(key);
    expect(extractKeyFromHash(`#${key}`)).toBe(key);
    expect(extractKeyFromHash(`#key=${key}&utm_source=qr`)).toBe(key);

    expect(extractKeyFromHash('')).toBeNull();
    expect(extractKeyFromHash('#key=invalidkey')).toBeNull();
    expect(extractKeyFromHash('#shortkey')).toBeNull();
  });

  it('converts buffers and hex strings accurately', () => {
    const hex = '0102030405060708090af0ff';
    const buffer = hexToBuffer(hex);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer).toHaveLength(12);

    const convertedHex = bufferToHex(buffer);
    expect(convertedHex).toBe(hex);
  });

  it('validates hex string length and handles invalid input', () => {
    expect(() => hexToBuffer('abc')).toThrow('Invalid hex string length');
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(isEncrypted(123 as any)).toBe(false);
  });

  it('throws on malformed encrypted ciphertext payloads', async () => {
    const key = await generateDecryptionKey();
    await expect(decryptUrl('enc:v1:onlyonepart', key)).rejects.toThrow('Invalid encrypted ciphertext format.');
  });
});
