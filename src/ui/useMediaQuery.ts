/**
 * Simple media query hook for responsive design.
 */

import { useState, useEffect } from 'react';

/**
 * Hook to check if a media query matches.
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to check if screen is at least a certain width.
 * @param minWidth - Minimum width in pixels
 * @returns Whether the screen is at least that wide
 */
export function useMinWidth(minWidth: number): boolean {
  return useMediaQuery(`(min-width: ${minWidth}px)`);
}
