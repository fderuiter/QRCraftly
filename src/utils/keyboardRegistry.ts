/**
 * Central registry for prioritized keyboard events.
 * Manages active keydown handlers and routes document-level events
 * in descending order of defined priority.
 */

interface KeyboardHandler {
  id: string;
  priority: number;
  onKeyDown: (event: KeyboardEvent) => boolean | void;
  index: number;
}

let registrationCounter = 0;
let handlers: KeyboardHandler[] = [];
let isListening = false;

/**
 * Global event listener for keydown events at the document level.
 */
function handleKeyDown(event: KeyboardEvent) {
  // Sort by priority descending, then by insertion index descending (newest first)
  const sortedHandlers = [...handlers].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.index - a.index;
  });

  for (const handler of sortedHandlers) {
    try {
      const continuePropagation = handler.onKeyDown(event);
      // Unless explicitly permitted (by returning true), stop executing subsequent handlers
      if (continuePropagation !== true) {
        break;
      }
    } catch (error) {
      console.error(`Error in keyboard handler with ID "${handler.id}":`, error);
      // Fallback keyboard operations must remain operational even if a high-priority handler encounters an unhandled error.
      // So we continue propagation to the next handlers/fallback in case of error.
    }
  }
}

/**
 * Register a prioritized keydown event handler.
 * @param id Unique identifier for the handler.
 * @param priority Number representing priority (higher priority runs first).
 * @param onKeyDown Callback function invoked with the KeyboardEvent.
 * @returns Function to unregister this handler.
 */
export function registerKeyboardHandler(
  id: string,
  priority: number,
  onKeyDown: (event: KeyboardEvent) => boolean | void
): () => void {
  // Prevent duplicate ID registrations by removing any pre-existing entry
  handlers = handlers.filter(h => h.id !== id);

  const index = ++registrationCounter;
  handlers.push({ id, priority, onKeyDown, index });

  if (!isListening && typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeyDown);
    isListening = true;
  }

  return () => unregisterKeyboardHandler(id);
}

/**
 * Unregister a keydown event handler by ID.
 * @param id Unique identifier for the handler.
 */
export function unregisterKeyboardHandler(id: string): void {
  handlers = handlers.filter(h => h.id !== id);

  if (handlers.length === 0 && isListening && typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown);
    isListening = false;
  }
}

/**
 * Helper to get currently registered handlers (mainly for debugging or testing).
 */
export function getRegisteredHandlers() {
  return [...handlers];
}

/**
 * Helper to completely clear the registry (useful in test environments).
 */
export function clearKeyboardRegistry() {
  handlers = [];
  if (isListening && typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown);
    isListening = false;
  }
}
