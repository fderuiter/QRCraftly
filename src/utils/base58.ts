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

/**
 * Base58 alphabet (Bitcoin/Solana variant).
 * Excludes 0, O, I, and l to avoid visual ambiguity.
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const BASE58_MAP: Record<string, number> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = i;
}

/**
 * Decodes a Base58-encoded string into a raw byte array (Uint8Array).
 * Throws an Error if the input string contains characters outside the Base58 alphabet.
 *
 * @param input - The Base58-encoded string to decode.
 * @returns Decodes bytes as Uint8Array.
 */
export function decodeBase58(input: string): Uint8Array {
  if (!input) {
    return new Uint8Array(0);
  }

  // Validate all characters in input first
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (BASE58_MAP[char] === undefined) {
      throw new Error(`Invalid Base58 character: "${char}"`);
    }
  }

  // Count leading '1's (representing 0x00 leading bytes)
  let zeroCount = 0;
  while (zeroCount < input.length && input[zeroCount] === '1') {
    zeroCount++;
  }

  if (zeroCount === input.length) {
    return new Uint8Array(zeroCount);
  }

  // Convert base 58 string to base 256 byte array
  const bytes: number[] = [];
  for (let i = zeroCount; i < input.length; i++) {
    let carry = BASE58_MAP[input[i]];
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Append leading zero bytes for leading '1's
  for (let k = 0; k < zeroCount; k++) {
    bytes.push(0);
  }

  // Reverse bytes array to obtain big-endian byte order
  return new Uint8Array(bytes.reverse());
}

/**
 * Validates a Solana payment address string.
 * Solana public keys are 32-byte Ed25519 keys encoded in Base58.
 *
 * @param address - The Solana address string to validate.
 * @returns An error message string if invalid, or null if valid.
 */
export function validateSolanaAddress(address: string): string | null {
  if (!address || address.trim() === '') {
    return null;
  }

  const trimmed = address.trim();

  let decoded: Uint8Array;
  try {
    decoded = decodeBase58(trimmed);
  } catch {
    return 'Invalid character: Solana addresses must use the Base58 alphabet.';
  }

  if (decoded.length !== 32) {
    return `Invalid address length: Solana addresses must decode to 32 bytes (got ${decoded.length} bytes).`;
  }

  return null;
}
