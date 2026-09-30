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
 * React hooks for the Audio QR page: Web Audio context lifecycle, the FSK chirp transceiver,
 * and the spectrogram QR synthesiser.
 */
export { useAudioContext } from './lib/useAudioContext';
export { useChirpTransceiver } from './lib/useChirpTransceiver';
export { useSpectrogramQR } from './lib/useSpectrogramQR';
