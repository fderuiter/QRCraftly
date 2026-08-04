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

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useOnClickOutside } from './useOnClickOutside';

describe('useOnClickOutside', () => {
  let container: HTMLDivElement;
  let child: HTMLSpanElement;
  let ref: { current: HTMLDivElement };

  beforeEach(() => {
    container = document.createElement('div');
    child = document.createElement('span');
    container.appendChild(child);
    document.body.appendChild(container);
    ref = { current: container };
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should call handler when clicking outside the element', () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Click outside
    const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when clicking inside the element', () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Click inside
    const insideEvent = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(insideEvent, 'target', { value: child });
    document.dispatchEvent(insideEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when isActive is false', () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler, false));

    const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useOnClickOutside(ref, handler));

    unmount();

    const outsideEvent = new MouseEvent('mousedown', { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).not.toHaveBeenCalled();
  });
});
