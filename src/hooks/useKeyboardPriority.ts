import { useEffect, useRef } from 'react';
import { registerKeyboardHandler } from '../utils/keyboardRegistry';

/**
 * Hook to register a prioritized keydown event handler with the central registry.
 * Automatically handles registration on mount/activation and cleanup on unmount/deactivation.
 * @param id A unique identifier for this event handler.
 * @param priority The priority level of this handler (higher values are executed first).
 * @param onKeyDown The callback to execute when a document keydown event occurs.
 * @param isActive Whether the event handler should be active. Defaults to true.
 */
export function useKeyboardPriority(
  id: string,
  priority: number,
  onKeyDown: (event: KeyboardEvent) => boolean | void,
  isActive: boolean = true
) {
  const savedOnKeyDown = useRef(onKeyDown);

  useEffect(() => {
    savedOnKeyDown.current = onKeyDown;
  }, [onKeyDown]);

  useEffect(() => {
    if (!isActive) return;

    const handler = (event: KeyboardEvent) => {
      return savedOnKeyDown.current(event);
    };

    const unregister = registerKeyboardHandler(id, priority, handler);

    return () => {
      unregister();
    };
  }, [id, priority, isActive]);
}
