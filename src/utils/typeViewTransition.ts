import { motionAllowed } from '@/hooks/usePresence';

/** Longest time the old frame may be held while the next type page renders. */
const MAX_HOLD_MS = 1000;

let finishPending: (() => void) | null = null;

/**
 * Lets the browser capture the new page and animate: ends a view transition started by
 * {@link startTypeViewTransition}. Safe to call when none is running.
 */
export function finishTypeViewTransition(): void {
  finishPending?.();
  finishPending = null;
}

/**
 * Starts a same-document view transition (a short crossfade) for a switch between QR type
 * pages; the type selector of the next page ends it once it has rendered. Progressive
 * enhancement: without `document.startViewTransition`, or under reduced motion, it does
 * nothing and the navigation is unchanged.
 */
export function startTypeViewTransition(): void {
  finishTypeViewTransition();
  if (typeof document.startViewTransition !== 'function' || !motionAllowed()) return;
  const rendered = new Promise<void>((resolve) => {
    finishPending = resolve;
  });
  const timer = setTimeout(finishTypeViewTransition, MAX_HOLD_MS);
  const transition = document.startViewTransition(() => rendered);
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  transition.finished.catch(() => {}).finally(() => clearTimeout(timer));
}
