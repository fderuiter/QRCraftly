/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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
 * Browser side of Zero-Knowledge Redirection. Destinations are encrypted in the browser with
 * AES-GCM before they reach the API, and the key only ever travels in the `#key=...` anchor.
 * Nothing here is imported by the Worker entry except the shared `isEncrypted` check, which
 * lives in the same private module.
 */
export {
  generateDecryptionKey,
  encryptUrl,
  decryptUrl,
  isEncrypted,
  extractKeyFromHash,
  bufferToHex,
  hexToBuffer,
} from './lib/encryption';
export { useRedirector } from './lib/useRedirector';
export type {
  DynamicQRRecord,
  ScanAnalytics,
  RedirectorFailure,
  RegisterResult,
  UpdateResult,
} from './lib/useRedirector';
