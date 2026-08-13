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
import { isDangerousUrl } from './src/utils/security';
import { applyOpticalSimulationMath } from './src/utils/opticalSimulation';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  export interface Assertion<T = any> extends matchers.AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AsymmetricMatchersContaining extends matchers.AxeMatchers {}
}

expect.extend(matchers);

declare global {
  var mockWorkerControl: {
    setInterceptor: (fn: ((message: any, worker: any) => void) | null) => void;
    setDelay: (ms: number) => void;
    setResponseOverride: (response: any) => void;
    setConcurrencyLimit: (limit: number) => void;
    getInstances: () => any[];
    reset: () => void;
    activeWorker: any;
  };
}

interface WorkerMockConfig {
  interceptor: ((message: any, worker: any) => void) | null;
  delayMs: number;
  responseOverride: any | null;
  concurrencyLimit: number;
  instances: any[];
  activeWorker: any | null;
}

const mockConfig: WorkerMockConfig = {
  interceptor: null,
  delayMs: 0,
  responseOverride: null,
  concurrencyLimit: Infinity,
  instances: [],
  activeWorker: null,
};

let runningTasksCount = 0;
const pendingTasks: Array<() => Promise<void>> = [];

function checkSerializable(val: any, path: any[] = []) {
  if (val === null || val === undefined) return;
  
  if (typeof val === 'function') {
    throw new DOMException('Functions cannot be cloned', 'DataCloneError');
  }
  if (typeof val === 'symbol') {
    throw new DOMException('Symbols cannot be cloned', 'DataCloneError');
  }
  if (val && (val instanceof Element || val.nodeType !== undefined || (val.ownerDocument && val.ownerDocument.defaultView))) {
    throw new DOMException('DOM elements cannot be cloned', 'DataCloneError');
  }

  if (path.includes(val)) {
    return;
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      for (const item of val) {
        checkSerializable(item, [...path, val]);
      }
    } else if (Object.prototype.toString.call(val) === '[object Object]') {
      for (const key of Object.keys(val)) {
        checkSerializable(val[key], [...path, val]);
      }
    }
  }
}

function runNextTasks() {
  while (pendingTasks.length > 0 && runningTasksCount < mockConfig.concurrencyLimit) {
    const nextTask = pendingTasks.shift();
    if (nextTask) {
      runningTasksCount++;
      nextTask().finally(() => {
        runningTasksCount--;
        runNextTasks();
      });
    }
  }
}

function enqueueTask(task: () => Promise<void>) {
  pendingTasks.push(task);
  runNextTasks();
}

class MockWorker {
  private listeners: Record<string, Set<(...args: any[]) => void>> = {};
  public terminated = false;
  private _onmessage: any = null;
  private _onerror: any = null;

  constructor(public url: string | URL, public options?: WorkerOptions) {
    mockConfig.instances.push(this);
    mockConfig.activeWorker = this;
  }

  addEventListener = vi.fn((type: string, listener: any) => {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set();
    }
    this.listeners[type].add(listener);
  });

  removeEventListener = vi.fn((type: string, listener: any) => {
    if (this.listeners[type]) {
      this.listeners[type].delete(listener);
    }
  });

  get onmessage() { return this._onmessage; }
  set onmessage(val) { this._onmessage = val; }

  get onerror() { return this._onerror; }
  set onerror(val) { this._onerror = val; }

  terminate = vi.fn(() => {
    this.terminated = true;
  });

  dispatchMessage(data: any) {
    if (this.terminated) return;
    const event = { data } as MessageEvent;
    
    if (this.listeners['message']) {
      this.listeners['message'].forEach(handler => {
        try { handler(event); } catch (e) { console.error(e); }
      });
    }
    if (typeof this._onmessage === 'function') {
      try { this._onmessage(event); } catch (e) { console.error(e); }
    }
  }

  dispatchError(error: any) {
    if (this.terminated) return;
    const event = { error } as any;
    if (this.listeners['error']) {
      this.listeners['error'].forEach(handler => {
        try { handler(event); } catch (e) { console.error(e); }
      });
    }
    if (typeof this._onerror === 'function') {
      try { this._onerror(event); } catch (e) { console.error(e); }
    }
  }

  postMessage = vi.fn((message: any, _transfer?: any) => {
    if (this.terminated) return;

    // Reject non-serializable objects under strict structured cloning rules (Requirement 1)
    checkSerializable(message);
    structuredClone(message);

    const delay = mockConfig.delayMs;
    const task = async () => {
      if (this.terminated) return;

      const executeTask = async () => {
        if (this.terminated) return;

        if (mockConfig.interceptor) {
          mockConfig.interceptor(message, this);
          return;
        }

        if (mockConfig.responseOverride !== null) {
          this.dispatchMessage(mockConfig.responseOverride);
          return;
        }

        // Run the actual verification engine logic (Requirement 2)
        try {
          if (this.url.toString().includes('imageDecoderWorker')) {
            const { buffer, width, height } = message;
            if (buffer && typeof width === 'number' && typeof height === 'number') {
              const { default: jsQR } = await import('jsqr');
              const data = new Uint8ClampedArray(buffer);
              let code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
              if (!code) {
                code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
              }
              if (code && code.data) {
                this.dispatchMessage({ success: true, data: code.data });
              } else {
                this.dispatchMessage({ success: false, error: 'No QR code detected in this image. Try a clearer or higher-contrast QR code image.' });
              }
              return;
            }
          }

          if (this.url.toString().includes('scannerWorker') && message && typeof message === 'object' && typeof message.sequenceId === 'number') {
            const { imageData, width, height } = message;
            if (imageData && typeof width === 'number' && typeof height === 'number') {
              const { default: jsQR } = await import('jsqr');
              let code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
              if (!code) {
                code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
              }
              if (code && code.data) {
                this.dispatchMessage({ success: true, decodedData: code.data, sequenceId: message.sequenceId });
              } else {
                this.dispatchMessage({ success: false, error: 'No QR code detected in this image. Try a clearer or higher-contrast QR code image.', sequenceId: message.sequenceId });
              }
              return;
            }
          }

          if (message && typeof message === 'object') {
            const { imageData, width, height, isTest, configId } = message;
            if (imageData && typeof width === 'number' && typeof height === 'number') {
              const { default: jsQR } = await import('jsqr');

              // 1. Digital pass check
              let digitalPass = false;
              let decodedData = '';
              let code = jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
              if (code) {
                digitalPass = true;
                decodedData = code.data;
              } else {
                code = jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
                if (code) {
                  digitalPass = true;
                  decodedData = code.data;
                }
              }

              // 2. Security Check (Dangerous URL check)
              if (digitalPass && isDangerousUrl(decodedData)) {
                const response = { success: false, physicalReady: false, error: 'SECURITY_VIOLATION', configId };
                this.dispatchMessage(response);
                return;
              }

              if (!digitalPass) {
                const response = { success: false, physicalReady: false, error: 'NOT_FOUND', configId };
                this.dispatchMessage(response);
                return;
              }

              // 3. Physical check (Optical Simulation math)
              let physicalPass = false;
              const simulatedData = isTest ? imageData : new ImageData(applyOpticalSimulationMath(imageData.data, width, height), width, height);
              let codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "dontInvert" });
              if (codeSim) {
                physicalPass = true;
              } else {
                codeSim = jsQR(simulatedData.data, width, height, { inversionAttempts: "attemptBoth" });
                if (codeSim) physicalPass = true;
              }

              const response = { success: true, physicalReady: physicalPass, configId };
              this.dispatchMessage(response);
              return;
            }
          }
        } catch (err: any) {
          console.error("Failed to run actual worker logic in MockWorker:", err);
        }

        // Default behavior fallback to prevent stuck UI:
        this.dispatchMessage({
          success: true,
          physicalReady: true,
          error: null,
        });
      };

      if (delay > 0) {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            executeTask().then(resolve);
          }, delay);
        });
      } else {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            executeTask().then(resolve);
          }, 0);
        });
      }
    };

    enqueueTask(task);
  });
}

globalThis.Worker = MockWorker as any;
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as any;
}
if (typeof window !== 'undefined') {
  (window as any).Worker = MockWorker as any;
}

globalThis.mockWorkerControl = {
  setInterceptor: (fn: ((message: any, worker: any) => void) | null) => {
    mockConfig.interceptor = fn;
  },
  setDelay: (ms: number) => {
    mockConfig.delayMs = ms;
  },
  setResponseOverride: (response: any) => {
    mockConfig.responseOverride = response;
  },
  setConcurrencyLimit: (limit: number) => {
    mockConfig.concurrencyLimit = limit;
  },
  getInstances: () => mockConfig.instances,
  get activeWorker() {
    return mockConfig.activeWorker;
  },
  set activeWorker(val) {
    mockConfig.activeWorker = val;
  },
  reset: () => {
    mockConfig.interceptor = null;
    mockConfig.delayMs = 0;
    mockConfig.responseOverride = null;
    mockConfig.concurrencyLimit = Infinity;
    runningTasksCount = 0;
    pendingTasks.length = 0;
    mockConfig.instances = [];
    mockConfig.activeWorker = null;
  }
};

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

  const mockObj = {
    create: createMock,
    toCanvas: vi.fn().mockResolvedValue(undefined),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    default: {
      create: createMock,
      toCanvas: vi.fn().mockResolvedValue(undefined),
      toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    }
  };

  (globalThis as any).mockQRCode = mockObj;

  return mockObj;
});

const originalImage = window.Image;

afterEach(() => {
  // Restore specific global state used across canvas tests
  window.Image = originalImage;
  if (globalThis.mockWorkerControl) {
    globalThis.mockWorkerControl.reset();
  }
});
