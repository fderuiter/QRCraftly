import { useEffect } from 'react';

/**
 * Hook to lock scrolling of the background document.
 * @param isActive Boolean indicating if the scroll lock is active.
 */
export function useScrollLock(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isActive]);
}
