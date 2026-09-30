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
 * Spawns a dedicated FSK Demodulator Worker. This is the only place the worker script is
 * referenced by path, so pages and hooks never reach into this package's files.
 * Requests must satisfy `assertFskWorkerRequest`; responses satisfy `isFskWorkerResponse`.
 * @returns The worker. Throws where Web Workers are unavailable so callers can report the failure.
 */
export function createFskDemodulatorWorker(): Worker {
  return new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
}
