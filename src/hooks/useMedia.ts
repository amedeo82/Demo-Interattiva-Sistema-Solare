/**
 * Hook media-query reattivi per il layout mobile.
 *
 * `useMediaQuery` si iscrive a `window.matchMedia` e si aggiorna quando la
 * query cambia (rotazione device, resize finestra). Il valore iniziale è
 * letto lazy: se `matchMedia` non esiste (vecchi jsdom/SSR) restituisce
 * `false`, così il layout di default resta quello desktop.
 */
import { useEffect, useState } from 'react';

/** Soglia mobile: sotto il breakpoint `lg` di Tailwind (1024px). */
export const MOBILE_QUERY = '(max-width: 1023px)';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True su viewport mobile/tablet (< 1024px): layout a sheet, header compatto. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
