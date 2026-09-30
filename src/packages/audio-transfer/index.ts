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
 * Air-gapped acoustic data transfer: the FSK chirp modem worker contract, and the
 * spectrogram QR DSP engine that paints QR modules into the audio spectrum.
 */
export {
  SYNC_FREQ,
  ZERO_FREQ,
  ONE_FREQ,
  isFskWorkerRequest,
  assertFskWorkerRequest,
  isFskWorkerResponse,
  assertFskWorkerResponse,
} from './lib/fskDemodulatorContract';
export type {
  FskWorkerRequest,
  FskWorkerResponse,
  FskProcessResponse,
} from './lib/fskDemodulatorContract';
export { scheduleSpectrogramQR, bufferToWav } from './lib/spectrogramDspEngine';
export type {
  SpectrogramDspOptions,
  SpectrogramModuleMatrix,
  ScheduledNodes,
} from './lib/spectrogramDspEngine';
