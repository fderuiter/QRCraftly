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

import { createMatrixWorker, createMazeWorker, loadQrEncoder, type QrEncoder } from '@/packages/qr-matrix';

/**
 * Dependencies of `QRCanvas` that differ between environments.
 *
 * Production uses the defaults below.
 */
export interface QrCanvasRuntime {
  /** Spawns the matrix worker, or returns null to encode on the main thread. */
  createMatrixWorker: () => Worker | null;
  /** Spawns the maze worker, or returns null to generate mazes on the main thread. */
  createMazeWorker: () => Worker | null;
  /** Returns the main-thread encoder, synchronously when it is already loaded. */
  loadEncoder: () => QrEncoder | Promise<QrEncoder>;
}

const defaultRuntime: QrCanvasRuntime = {
  createMatrixWorker,
  createMazeWorker,
  loadEncoder: loadQrEncoder,
};

/**
 * Returns the runtime `QRCanvas` should use right now.
 */
export function getQrCanvasRuntime(): QrCanvasRuntime {
  return defaultRuntime;
}
