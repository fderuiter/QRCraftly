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

import React, { KeyboardEvent, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import { usePresence } from '@/hooks/usePresence';

/**
 * One action in a {@link Menu}.
 */
export interface MenuItem {
  /** Stable key. */
  id: string;
  /** Visible content; becomes the item's accessible name. */
  label: ReactNode;
  /** Runs after the menu closes and focus has returned to the trigger. */
  onSelect: () => void;
  /** Draws a separator above this item. */
  separatorBefore?: boolean;
}

/**
 * Properties passed to the trigger renderer. Spread them onto a `Button`.
 */
interface MenuTriggerProps {
  /** Trigger element id (labels the menu). */
  id: string;
  /** Ref used for focus restoration. */
  ref: RefObject<HTMLButtonElement | null>;
  /** Toggles the menu. */
  onClick: () => void;
  /** Opens the menu from the keyboard with Arrow Down / Arrow Up. */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  /** Announces the popup type. */
  'aria-haspopup': 'menu';
  /** Announces the open state. */
  'aria-expanded': boolean;
  /** Points at the menu element. */
  'aria-controls': string;
}

/**
 * Properties for {@link Menu}.
 */
interface MenuProps {
  /** Base id for the trigger (`<id>-trigger`) and menu (`<id>-menu`). */
  id: string;
  /** Menu actions. */
  items: MenuItem[];
  /** Renders the trigger button. */
  renderTrigger: (props: MenuTriggerProps) => ReactNode;
  /** Optional external ref for the trigger (for callers that also restore focus to it). */
  triggerRef?: RefObject<HTMLButtonElement | null>;
  /** Wrapper classes. */
  className?: string;
}

/**
 * Accessible menu button following the WAI-ARIA menu button pattern:
 * the trigger exposes `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`;
 * opening (click, Enter, Space or Arrow Down) focuses the first item and Arrow Up the last;
 * Arrow Up/Down, Home and End move between items; Escape closes and restores trigger focus;
 * Tab, focus leaving or a pointer press outside closes it; choosing an item closes the menu
 * and returns focus to the trigger before running the action. Items are unmounted when
 * closed, so hidden content can never keep focus.
 * @param props - Menu properties.
 * @returns The menu button and its popup.
 */
export function Menu({ id, items, renderTrigger, triggerRef: externalTriggerRef, className = '' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState(0);
  const internalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = externalTriggerRef ?? internalTriggerRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerId = `${id}-trigger`;
  const menuId = `${id}-menu`;

  const close = useCallback(() => setOpen(false), []);
  // Closed items stay briefly (inert) for the exit animation; instant under reduced motion.
  const { mounted, closing } = usePresence(open, 120);
  usePopoverDismiss({ open, containerRef, triggerRef, onClose: close });

  useEffect(() => {
    if (open) itemRefs.current[initialFocus]?.focus();
  }, [open, initialFocus]);

  const openAt = (index: number) => {
    setInitialFocus(index);
    setOpen(true);
  };

  const focusItem = (index: number) => {
    const count = items.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const select = (item: MenuItem) => {
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      {renderTrigger({
        id: triggerId,
        ref: triggerRef,
        onClick: () => (open ? setOpen(false) : openAt(0)),
        onKeyDown: onTriggerKeyDown,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': menuId,
      })}
      {mounted && (
        <div
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-labelledby={triggerId}
          onKeyDown={onMenuKeyDown}
          data-closed={closing || undefined}
          inert={closing || undefined}
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface-raised py-1 shadow-overlay motion-safe:animate-rise-in motion-safe:data-closed:animate-rise-out"
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore && <div role="separator" className="my-1 h-px bg-line" />}
              <Button
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="menuitem"
                variant="menuitem"
                tabIndex={-1}
                onClick={() => select(item)}
              >
                {item.label}
              </Button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
