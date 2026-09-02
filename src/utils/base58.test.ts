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

import { describe, it, expect } from 'vitest';
import { decodeBase58, validateSolanaAddress } from './base58';

describe('Base58 Decoder & Solana Address Validation', () => {
  describe('decodeBase58', () => {
    it('returns empty Uint8Array for empty string', () => {
      expect(decodeBase58('')).toEqual(new Uint8Array(0));
    });

    it('decodes single leading 1 as zero byte', () => {
      expect(decodeBase58('1')).toEqual(new Uint8Array([0]));
    });

    it('decodes 32 leading 1s as 32 zero bytes', () => {
      const decoded = decodeBase58('11111111111111111111111111111111');
      expect(decoded.length).toBe(32);
      expect(decoded.every((b) => b === 0)).toBe(true);
    });

    it('decodes valid Base58 Solana public key strings correctly', () => {
      // Known Solana addresses
      const addr1 = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya';
      const decoded1 = decodeBase58(addr1);
      expect(decoded1.length).toBe(32);

      const sysProgram = '11111111111111111111111111111111';
      const decodedSys = decodeBase58(sysProgram);
      expect(decodedSys.length).toBe(32);

      const tokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
      const decodedToken = decodeBase58(tokenProgram);
      expect(decodedToken.length).toBe(32);
    });

    it('throws error when string contains non-Base58 characters', () => {
      expect(() => decodeBase58('0uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5LyaO')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5LyaI')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lyal')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('4uQeVj5tqViQh7-WWGStvkEG1Zmhx6uas54G2M4G5Lya')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('4uQeVj5tqViQh7 WWGStvkEG1Zmhx6uas54G2M4G5Lya')).toThrow('Invalid Base58 character');
    });
  });

  describe('validateSolanaAddress', () => {
    it('returns null for empty address', () => {
      expect(validateSolanaAddress('')).toBeNull();
      expect(validateSolanaAddress('   ')).toBeNull();
    });

    it('returns null for valid 32-byte Base58 Solana addresses', () => {
      expect(validateSolanaAddress('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya')).toBeNull();
      expect(validateSolanaAddress('11111111111111111111111111111111')).toBeNull();
      expect(validateSolanaAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBeNull();
    });

    it('returns invalid character error when address contains non-Base58 characters', () => {
      const result = validateSolanaAddress('0uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lya');
      expect(result).not.toBeNull();
      expect(result).toContain('Base58');

      const resultO = validateSolanaAddress('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5LyaO');
      expect(resultO).not.toBeNull();
      expect(resultO).toContain('Base58');
    });

    it('returns length validation error when Base58 string decodes to byte count other than 32', () => {
      // Short address (decodes to 31 bytes)
      const shortAddr = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Ly';
      const resultShort = validateSolanaAddress(shortAddr);
      expect(resultShort).not.toBeNull();
      expect(resultShort).toContain('32 bytes');

      // Long address (decodes to >32 bytes)
      const longAddr = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uas54G2M4G5Lyaaa';
      const resultLong = validateSolanaAddress(longAddr);
      expect(resultLong).not.toBeNull();
      expect(resultLong).toContain('32 bytes');

      // Very short address ("111" decodes to 3 bytes)
      const veryShort = validateSolanaAddress('111');
      expect(veryShort).not.toBeNull();
      expect(veryShort).toContain('32 bytes');
    });
  });
});
