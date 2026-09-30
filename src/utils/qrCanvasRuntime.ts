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

import type { QRErrorCorrectionLevel, QRModules } from '../types';

/**
 * The part of the `qrcode` encoder that the canvas uses on the main thread.
 */
export interface QrEncoder {
  create(value: string, options: { errorCorrectionLevel: QRErrorCorrectionLevel }): { modules: QRModules };
}

/**
 * Dependencies of `QRCanvas` that differ between environments.
 *
 * Production uses the defaults below. Environments without real Web Workers
 * (such as jsdom) inject their own through `setQrCanvasRuntime` instead of the
 * component sniffing for a test runner.
 */
export interface QrCanvasRuntime {
  /** Spawns the matrix worker, or returns null to encode on the main thread. */
  createMatrixWorker: () => Worker | null;
  /** Spawns the maze worker, or returns null to generate mazes on the main thread. */
  createMazeWorker: () => Worker | null;
  /** Returns the main-thread encoder, synchronously when it is already loaded. */
  loadEncoder: () => QrEncoder | Promise<QrEncoder>;
}

/**
 * Adapts the `qrcode` package, whose modules report 0 or 1, to the boolean `QRModules` contract.
 */
export function fromQrcodePackage(qrcode: Pick<typeof import('qrcode'), 'create'>): QrEncoder {
  return {
    create: (value, options) => {
      const { modules } = qrcode.create(value, options);
      return { modules: { size: modules.size, get: (row, col) => Boolean(modules.get(row, col)) } };
    },
  };
}

const hasWorker = (): boolean => typeof window !== 'undefined' && typeof Worker !== 'undefined';

const defaultRuntime: QrCanvasRuntime = {
  createMatrixWorker: () =>
    hasWorker() ? new Worker(new URL('./matrixWorker.ts', import.meta.url), { type: 'module' }) : null,
  createMazeWorker: () =>
    hasWorker() ? new Worker(new URL('./mazeWorker.ts', import.meta.url), { type: 'module' }) : null,
  loadEncoder: () => import('qrcode').then((mod) => fromQrcodePackage(mod.default ?? mod)),
};

let activeRuntime: QrCanvasRuntime = defaultRuntime;

/**
 * Returns the runtime `QRCanvas` should use right now.
 */
export function getQrCanvasRuntime(): QrCanvasRuntime {
  return activeRuntime;
}

/**
 * Replaces parts of the runtime. Returns a function that restores the previous runtime.
 */
export function setQrCanvasRuntime(overrides: Partial<QrCanvasRuntime>): () => void {
  const previous = activeRuntime;
  activeRuntime = { ...activeRuntime, ...overrides };
  return () => {
    activeRuntime = previous;
  };
}
