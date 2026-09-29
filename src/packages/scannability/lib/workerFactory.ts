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
 * Spawns a dedicated Scannability Worker. This is the only place the worker script is
 * referenced by path, so other packages and pages never reach into this package's files.
 * Requests must satisfy `assertWorkerRequest`; responses satisfy `isWorkerResponse`.
 * @returns The worker, or null where Web Workers are unavailable (SSR, old browsers).
 */
export function createScannabilityWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    console.error('Failed to spawn the Scannability Worker:', err);
    return null;
  }
}
