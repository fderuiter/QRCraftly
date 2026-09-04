/* eslint-disable security/detect-object-injection */
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
 * Pre-allocated contiguous memory pool for caching pre-rendered QR code frame matrices.
 * Prevents garbage collection pauses, allocations, and CPU spikes during active animation playback and loop wraps.
 * Backward-compatibility re-export shim.
 * Canonical implementation now lives in @/packages/optical-transfer/sender.
 */
export {
  PreallocatedFramePool,
  shuffleInPlace,
} from '@/packages/optical-transfer/sender';
