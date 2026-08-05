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

import { RefObject, useCallback } from 'react';
import { useGlobalEvent } from './useGlobalEvent';

/**
 * Hook to handle clicks outside of a specified element.
 * Useful for closing dropdowns, modals, and menus.
 * @param ref The ref of the element to detect outside clicks for.
 * @param handler Callback fired when an outside click occurs.
 * @param isActive Boolean indicating if the listener should be attached. Defaults to true.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  isActive: boolean = true
) {
  const listener = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isActive) return;
    // Do nothing if clicking ref's element or descendent elements
    if (!ref.current || ref.current.contains(event.target as Node)) {
      return;
    }
    handler(event);
  }, [ref, handler, isActive]);

  useGlobalEvent('mousedown', listener as (e: MouseEvent) => void);
  useGlobalEvent('touchstart', listener as (e: TouchEvent) => void);
}
