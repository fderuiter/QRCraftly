import { useEffect, useRef } from 'react';

/**
 * A standardized focus-management hook to eliminate manual re-navigation
 * and improve task completion speed for users with visual impairments.
 * Programmatically moves focus to the first interactive field of a newly rendered component.
 * 
 * @param dependencies Array of dependencies that trigger focus shifts when changed
 */
export function useDynamicFocus<T extends HTMLElement = HTMLDivElement>(dependencies: any[]) {
  const containerRef = useRef<T>(null);
  
  // Track if we've focused once on mount. Focus shifts must only occur 
  // during intentional user-triggered type changes.
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; 
    }

    if (!containerRef.current) return;

    // Small delay to ensure the DOM is fully updated and component rendered
    const timeout = setTimeout(() => {
      if (!containerRef.current) return;
      const focusableElements = containerRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, dependencies);

  return containerRef;
}
