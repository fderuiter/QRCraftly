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
import { vi } from 'vitest';

// Mock Worker for JSDom
if (typeof Worker === 'undefined') {
  global.Worker = class {
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    postMessage(msg: any) {
      if (this.onmessage) {
        this.onmessage({ data: { success: true } } as any);
      }
    }
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
  } as any;
}
