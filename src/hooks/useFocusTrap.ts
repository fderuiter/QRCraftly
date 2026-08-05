import { useEffect, RefObject, useId } from 'react';
import { useKeyboardPriority } from './useKeyboardPriority';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hook to trap keyboard focus within a container element.
 * Handles auto-focusing the first interactive element upon opening,
 * trapping focus during Tab / Shift+Tab navigation, and
 * restoring focus to the initiating element upon dismissal.
 * @param containerRef Ref pointing to the modal container element.
 * @param isActive Boolean indicating if the focus trap is active.
 * @param priority Number indicating priority of the focus trap keyboard handler. Defaults to 100.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  priority: number = 100
) {
  const trapId = useId();

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement;

    // Direct keyboard focus to the first interactive element inside the modal upon opening
    const focusFirst = () => {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;
      const focusables = Array.from(currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    };

    focusFirst();
    const rafId = requestAnimationFrame(focusFirst);

    return () => {
      cancelAnimationFrame(rafId);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
        requestAnimationFrame(() => {
          if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
          }
        });
      }
    };
  }, [containerRef, isActive]);

  // Handle Tab navigation trapping through prioritized keyboard registry
  useKeyboardPriority(
    `focus-trap-${trapId}`,
    priority,
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return true; // Explicitly permit other keydown handlers

      const currentContainer = containerRef.current;
      if (!currentContainer) return true;

      const currentFocusables = Array.from(currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (currentFocusables.length === 0) return true;

      const firstEl = currentFocusables[0];
      const lastEl = currentFocusables[currentFocusables.length - 1];
      const activeEl = document.activeElement as HTMLElement;

      // Programmatic traversal to guarantee consistent multi-browser behavior
      e.preventDefault();

      const currentIndex = currentFocusables.indexOf(activeEl);
      if (e.shiftKey) {
        const focusPrev = () => {
          if (currentIndex <= 0 || !currentContainer.contains(activeEl)) {
            lastEl.focus();
          } else {
            currentFocusables[currentIndex - 1].focus();
          }
        };
        focusPrev();
        requestAnimationFrame(focusPrev);
      } else {
        const focusNext = () => {
          if (currentIndex === -1 || currentIndex === currentFocusables.length - 1 || !currentContainer.contains(activeEl)) {
            firstEl.focus();
          } else {
            currentFocusables[currentIndex + 1].focus();
          }
        };
        focusNext();
        requestAnimationFrame(focusNext);
      }

      return false; // Intercepted: stop further propagation to lower priority handlers
    },
    isActive
  );
}
