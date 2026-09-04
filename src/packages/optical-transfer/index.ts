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
 * Optical Transfer Engine — Primary Root Entry Point
 * Consolidates screen-to-camera optical file transfer, rateless fountain codes,
 * frame memory pooling, and protocol lookahead behind minimal entry-point seams.
 */

export {
  createTransferSession,
  TransferSession,
  sanitizeStreamConfig,
  verifyHandshakeFrame,
  PreallocatedFramePool,
  shuffleInPlace,
  type CachedFrame,
} from './sender';

export {
  createReceiverSession,
  ReceiverSession,
} from './receiver';

export {
  type HandshakeInfo,
  type TransferStats,
  type StreamFrame,
  type SenderSessionOptions,
  type ReceiverSessionOptions,
} from './lib/contracts';

export { FountainEncoder } from './lib/fountain/encoder';
export { FountainDecoder } from './lib/fountain/decoder';
export {
  buildRobustSolitonCdf,
  sampleDegreeFromCdf,
  getNeighborsForSeq,
  createPrng,
} from './lib/fountain/soliton';
export {
  serializeDroplet,
  parseDropletString,
  isFountainDropletString,
  FOUNTAIN_URI_PREFIX,
} from './lib/fountain/envelope';

export {
  StreamLookaheadReceiver,
  type StreamLookaheadConfig,
  DANGEROUS_SCHEMES,
  decodeHtmlEntities,
  recursiveDecode,
} from './lib/streamLookahead';
