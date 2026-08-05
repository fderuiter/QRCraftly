import { useEffect, useRef } from 'react';

/**
 * A unified hook to register global event listeners (like click, mousedown, touchstart, focusin, etc.)
 * with automatic cleanup on component unmount or when dependencies change.
 * @param type The event type (e.g. 'mousedown', 'touchstart', 'focusin').
 * @param listener The callback function to invoke when the event fires.
 * @param target The target element to attach the event listener to (defaults to document).
 * @param options Additional options for the event listener (e.g., passive, capture).
 */
export function useGlobalEvent<K extends keyof DocumentEventMap>(
  type: K,
  listener: (ev: DocumentEventMap[K]) => void,
  target: EventTarget | null = typeof document !== 'undefined' ? document : null,
  options?: boolean | AddEventListenerOptions
) {
  const savedListener = useRef(listener);

  useEffect(() => {
    savedListener.current = listener;
  }, [listener]);

  useEffect(() => {
    if (!target) return;

    const eventHandler = (event: Event) => {
      savedListener.current(event as DocumentEventMap[K]);
    };

    target.addEventListener(type, eventHandler, options);

    return () => {
      target.removeEventListener(type, eventHandler, options);
    };
  }, [type, target, options]);
}
