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

import { useCallback, useRef } from 'react';
import { SCAN_FRAME_SIZE } from '@/packages/arcade';
import { useLatestRef } from '@/packages/arcade/client';

/**
 * Returns a capture function that paints the current board into a reusable offscreen
 * 256x256 canvas and reads its pixels for the empirical scanners.
 * @param paint - Paints the board (module state only, no effects) into the frame.
 * @returns The capture function; null results mean no 2D canvas is available.
 */
export function useScanFrameCapture(paint: (ctx: CanvasRenderingContext2D) => void): () => ImageData | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintRef = useLatestRef(paint);

  return useCallback(() => {
    if (typeof document === 'undefined') return null;
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = SCAN_FRAME_SIZE;
      canvas.height = SCAN_FRAME_SIZE;
      canvasRef.current = canvas;
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    paintRef.current(ctx);
    return ctx.getImageData(0, 0, SCAN_FRAME_SIZE, SCAN_FRAME_SIZE);
  }, [paintRef]);
}
