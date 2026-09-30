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
 * Minimal worker module for tests/inThreadWorker.test.ts. It keeps module-level
 * state, posts after an `await`, and throws on request, so the harness's scope
 * isolation, async `self` resolution and error forwarding can be checked.
 */
let received = 0;

self.onmessage = async (e: MessageEvent<{ kind: 'echo' | 'throw'; value?: unknown }>) => {
  received += 1;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (e.data.kind === 'throw') {
    throw new Error('echo worker failure');
  }
  self.postMessage({ echo: e.data.value, received });
};
