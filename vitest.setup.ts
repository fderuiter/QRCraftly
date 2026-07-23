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
import 'vitest-axe/extend-expect';
import * as matchers from 'vitest-axe/matchers';
import { vi, afterEach, expect } from 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  export interface Assertion<T = any> extends matchers.AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AsymmetricMatchersContaining extends matchers.AxeMatchers {}
}

expect.extend(matchers);

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

// ---------------------------------------------------------------------------
// Global mocks for Canvas Context, Fetch, URL
// ---------------------------------------------------------------------------

const createMockContext = () => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  roundRect: vi.fn(),
  beginPath: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  save: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  bezierCurveTo: vi.fn(),
  setLineDash: vi.fn(),
  strokeRect: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  getImageData: vi.fn().mockImplementation((_x: any, _y: any, w: any, h: any) => ({
    data: new Uint8ClampedArray(w * h * 4)
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue([]),
  setTransform: vi.fn(),
  transform: vi.fn(),
  clip: vi.fn(),
  quadraticCurveTo: vi.fn(),
  canvas: { width: 0, height: 0 },
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
});

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function (this: HTMLCanvasElement, contextId: string) {
  if (contextId === '2d') {
    if (!(this as any)._mockContext) {
      (this as any)._mockContext = createMockContext();
    }
    return (this as any)._mockContext;
  }
  return null;
}) as any;

const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
  const el = originalCreateElement(tagName, options);
  if (tagName.toLowerCase() === 'canvas') {
    (el as HTMLCanvasElement).getContext = HTMLCanvasElement.prototype.getContext;
  }
  return el;
});

if (!HTMLCanvasElement.prototype.toBlob) {
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, _type?: string, _quality?: any) {
    setTimeout(() => callback(new Blob([])), 0);
  };
}

if (!HTMLCanvasElement.prototype.toDataURL) {
  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/png;base64,mock';
  };
}

import http from 'node:http';
import https from 'node:https';

const originalHttpRequest = http.request;
const originalHttpGet = http.get;
const originalHttpsRequest = https.request;
const originalHttpsGet = https.get;

function isUrlAllowed(input: any): boolean {
  if (!input) return true;
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (typeof input === 'object' && input !== null) {
    if ('url' in input) {
      urlStr = input.url;
    } else if (typeof input.toString === 'function') {
      urlStr = input.toString();
    }
  }

  if (!urlStr.includes('://') && !urlStr.startsWith('//')) {
    return true;
  }

  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return true;
  }
}

function verifyNodeUrl(options: any) {
  let host = '';
  if (typeof options === 'string') {
    try {
      const u = new URL(options);
      host = u.hostname;
    } catch {
      host = options;
    }
  } else if (options) {
    host = options.hostname || options.host || '';
    if (host.includes(':')) {
      host = host.split(':')[0];
    }
  }

  if (host) {
    const lowerHost = host.toLowerCase();
    if (
      lowerHost !== 'localhost' &&
      lowerHost !== '127.0.0.1' &&
      lowerHost !== '0.0.0.0' &&
      !lowerHost.endsWith('.localhost') &&
      lowerHost !== ''
    ) {
      throw new Error(`Unmocked external network request to http://${host} is blocked in the sandboxed test environment.`);
    }
  }
}

http.request = function (this: any, options: any, ...args: any[]) {
  verifyNodeUrl(options);
  return (originalHttpRequest as any).apply(this, [options, ...args]);
} as any;

http.get = function (this: any, options: any, ...args: any[]) {
  verifyNodeUrl(options);
  return (originalHttpGet as any).apply(this, [options, ...args]);
} as any;

https.request = function (this: any, options: any, ...args: any[]) {
  verifyNodeUrl(options);
  return (originalHttpsRequest as any).apply(this, [options, ...args]);
} as any;

https.get = function (this: any, options: any, ...args: any[]) {
  verifyNodeUrl(options);
  return (originalHttpsGet as any).apply(this, [options, ...args]);
} as any;

global.fetch = vi.fn().mockImplementation((input: any) => {
  if (!isUrlAllowed(input)) {
    throw new Error(`Unmocked external network request to ${input} is blocked in the sandboxed test environment.`);
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
  });
}) as any;

if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
} else {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
}

if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn();
} else {
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
}

// ---------------------------------------------------------------------------
// Global mocks for QRCode
// ---------------------------------------------------------------------------

vi.mock('qrcode', () => {
  const createMock = vi.fn().mockImplementation((val) => {
    if (!val) throw new Error('Value is required');
    return {
      modules: {
        size: 21,
        get: vi.fn().mockImplementation((r, c) => ((r === 0 && c === 0) || (r === 10 && c === 10))),
      }
    };
  });

  return {
    create: createMock,
    toCanvas: vi.fn().mockResolvedValue(undefined),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    default: {
      create: createMock,
      toCanvas: vi.fn().mockResolvedValue(undefined),
      toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    }
  };
});

const originalImage = window.Image;

afterEach(() => {
  // Restore specific global state used across canvas tests
  window.Image = originalImage;
});
