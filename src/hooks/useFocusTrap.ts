import { useEffect, RefObject } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hook to trap keyboard focus within a container element.
 * Handles auto-focusing the first interactive element upon opening,
 * trapping focus during Tab / Shift+Tab navigation, and
 * restoring focus to the initiating element upon dismissal.
 * @param containerRef Ref pointing to the modal container element.
 * @param isActive Boolean indicating if the focus trap is active.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement;

    // Direct keyboard focus to the first interactive element inside the modal upon opening
    const timeoutId = setTimeout(() => {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;
      const focusables = Array.from(currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const currentFocusables = Array.from(currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (currentFocusables.length === 0) return;

      const firstEl = currentFocusables[0];
      const lastEl = currentFocusables[currentFocusables.length - 1];
      const activeEl = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (activeEl === firstEl || !currentContainer.contains(activeEl)) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (activeEl === lastEl || !currentContainer.contains(activeEl)) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, isActive]);
}
