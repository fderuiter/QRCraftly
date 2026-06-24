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

import '@testing-library/jest-dom';

if (typeof globalThis.Worker === 'undefined') {
  globalThis.Worker = class {
    constructor() {}
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  } as any;
}

if (typeof window !== 'undefined' && !window.Worker) {
  (window as any).Worker = globalThis.Worker;
}

// Unconditionally override getContext to avoid jsdom errors when canvas package is missing
HTMLCanvasElement.prototype.getContext = function () {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (_x: any, _y: any, w: any, h: any) => ({
      data: new Uint8ClampedArray(w * h * 4)
    }),
    putImageData: () => {},
    createImageData: () => ([]),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as any;
};

// Mock Image so that setting src instantly triggers onload, preventing test timeouts
const OriginalImage = window.Image;
window.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin: string | null = null;
  _src: string = '';

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, _type?: string, _quality?: any) {
  setTimeout(() => callback(new Blob([])), 0);
};

HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,';
};
