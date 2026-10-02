import { useEffect, useState } from 'react';

/** Matches the `--duration-base` motion token (ms): how long exit animations run. */
export const EXIT_DURATION_MS = 200;

/**
 * Whether the browser should animate: false when the user asks for reduced motion and in
 * environments without `matchMedia` (server rendering, unit tests), so nothing waits there.
 * @returns True when exit animations may run.
 */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Keeps an element mounted for its exit animation. While `open` is true the element is
 * mounted and not closing; when `open` turns false it stays mounted with `closing` set for
 * `duration` ms (so a `data-closed` exit animation can play) and then unmounts. Under
 * reduced motion, or without `matchMedia`, it unmounts at once.
 * @param open - Whether the element should be shown.
 * @param duration - Exit animation length in ms.
 * @returns `mounted` (render it) and `closing` (play the exit animation, ignore input).
 */
export function usePresence(open: boolean, duration: number = EXIT_DURATION_MS): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!motionAllowed()) {
      setMounted(false);
      return;
    }
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  // Without motion the element unmounts in the same render that closes it.
  const lingering = !open && mounted && motionAllowed();
  return { mounted: open || lingering, closing: lingering };
}
