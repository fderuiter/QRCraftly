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
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  InThreadWorker,
  assertStructuredCloneable,
  loadWorkerModule,
  resolveWorkerModulePath,
} from './utils/inThreadWorker';

const ECHO_URL = new URL('./fixtures/echoWorker.ts', import.meta.url);
const ECHO_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'echoWorker.ts');

/** Resolves with the next message the worker posts to the main thread. */
const nextMessage = (worker: InThreadWorker) =>
  new Promise<unknown>((resolve) => {
    worker.onmessage = (event) => resolve(event.data);
  });

describe('InThreadWorker (#983)', () => {
  it('resolves file URLs and Vite dev-server worker URLs to the worker module on disk', () => {
    expect(resolveWorkerModulePath(ECHO_URL)).toBe(ECHO_PATH);
    expect(
      resolveWorkerModulePath('http://localhost:3000/tests/fixtures/echoWorker.ts?worker_file&type=module'),
    ).toBe(ECHO_PATH);
    expect(resolveWorkerModulePath(`http://localhost:3000/@fs${ECHO_PATH}?worker_file`)).toBe(ECHO_PATH);
    expect(resolveWorkerModulePath('http://localhost:3000/tests/fixtures/missingWorker.ts')).toBeNull();
    expect(resolveWorkerModulePath('mock-url')).toBeNull();
  });

  it('runs the real worker module and routes self.postMessage back to its own Worker after an await', async () => {
    const first = new InThreadWorker(ECHO_URL);
    const second = new InThreadWorker(ECHO_URL);

    const firstReply = nextMessage(first);
    const secondReply = nextMessage(second);
    first.postMessage({ kind: 'echo', value: 'one' });
    second.postMessage({ kind: 'echo', value: 'two' });

    // Each worker has its own module instance, so module-level state is not shared.
    await expect(firstReply).resolves.toEqual({ echo: 'one', received: 1 });
    await expect(secondReply).resolves.toEqual({ echo: 'two', received: 1 });

    const again = nextMessage(first);
    first.postMessage({ kind: 'echo', value: 'three' });
    await expect(again).resolves.toEqual({ echo: 'three', received: 2 });
  });

  it('delivers messages asynchronously and stops after terminate()', async () => {
    const worker = new InThreadWorker(ECHO_URL);
    const onmessage = vi.fn();
    worker.onmessage = onmessage;
    worker.postMessage({ kind: 'echo', value: 'late' });
    expect(onmessage).not.toHaveBeenCalled();
    worker.terminate();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onmessage).not.toHaveBeenCalled();
  });

  it('forwards errors thrown by the worker handler to onerror', async () => {
    const worker = new InThreadWorker(ECHO_URL);
    const error = new Promise<ErrorEvent>((resolve) => {
      worker.onerror = resolve;
    });
    worker.postMessage({ kind: 'throw' });
    const event = await error;
    expect(event.message).toBe('echo worker failure');
  });

  it('reports an error event when the worker module cannot be found', async () => {
    const worker = new InThreadWorker('mock-url');
    const error = new Promise<ErrorEvent>((resolve) => {
      worker.onerror = resolve;
    });
    worker.postMessage({ kind: 'echo' });
    expect((await error).message).toContain('cannot find the worker module');
  });

  it('rejects payloads a real postMessage cannot clone, synchronously', () => {
    const worker = new InThreadWorker(ECHO_URL);
    expect(() => worker.postMessage({ handler: () => {} })).toThrow(DOMException);
    expect(() => assertStructuredCloneable({ nested: [Symbol('x')] })).toThrow(DOMException);
    expect(() => assertStructuredCloneable({ data: new Uint8Array(4), list: [1, 'a', null] })).not.toThrow();
    worker.terminate();
  });

  it('loads a worker module for direct handler tests without touching the global self', async () => {
    const globalSelf = (globalThis as { self?: unknown }).self;
    const { scope, handle } = await loadWorkerModule(ECHO_URL);
    const posted = vi.fn();
    scope.postMessage = posted;
    await handle({ data: { kind: 'echo', value: 42 } });
    expect(posted).toHaveBeenCalledWith({ echo: 42, received: 1 });
    expect((globalThis as { self?: unknown }).self).toBe(globalSelf);
  });
});
