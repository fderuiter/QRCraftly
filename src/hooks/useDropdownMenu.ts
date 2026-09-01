import { useEffect, RefObject } from 'react';

const MENU_ITEM_SELECTOR = '[role="menuitem"], button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Options for configuring the WAI-ARIA dropdown menu keyboard navigation hook.
 */
export interface UseDropdownMenuOptions {
  /**
   * Boolean indicating whether the dropdown menu is currently visible.
   */
  isOpen: boolean;
  /**
   * Callback invoked to close the dropdown menu.
   */
  onClose: () => void;
  /**
   * React ref referencing the dropdown container element.
   */
  menuRef: RefObject<HTMLElement | null>;
  /**
   * Optional React ref referencing the trigger element that opened the menu.
   */
  triggerRef?: RefObject<HTMLElement | null>;
}

/**
 * Primitive hook managing WAI-ARIA keyboard navigation for dropdown menus.
 * Handles Up, Down, Home, End, Escape, and focus restoration to the trigger element.
 * @param options Configuration options for dropdown navigation.
 * @param options.isOpen Boolean indicating whether dropdown menu is open.
 * @param options.onClose Callback function to close the menu.
 * @param options.menuRef Ref to menu container DOM element.
 * @param options.triggerRef Ref to triggering button DOM element.
 */
export function useDropdownMenu({ isOpen, onClose, menuRef, triggerRef }: UseDropdownMenuOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const menu = menuRef.current;
    if (!menu) return;

    // Shift focus to the first focusable menu item upon opening
    const focusables = Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentMenu = menuRef.current;
      if (!currentMenu) return;

      const items = Array.from(currentMenu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
      if (items.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      const currentIndex = items.indexOf(activeEl);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
          items[nextIndex].focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
          items[prevIndex].focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          items[0].focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          items[items.length - 1].focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          if (triggerRef?.current && typeof triggerRef.current.focus === 'function') {
            triggerRef.current.focus();
          }
          break;
        }
        case 'Tab': {
          onClose();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef?.current && typeof triggerRef.current.focus === 'function' && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose, menuRef, triggerRef]);
}
