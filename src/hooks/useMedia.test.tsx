import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, MOBILE_QUERY } from './useMedia';

/**
 * Override del mock matchMedia di setup.ts (writable): restituisce `matches`
 * dal valore corrente di `currentMatches`, mutabile fra i test.
 */
let currentMatches = false;
function installMatchMedia(matches: boolean) {
  currentMatches = matches;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === MOBILE_QUERY ? currentMatches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.add(cb);
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.delete(cb);
      },
      dispatchEvent: () => false,
    }),
  });
}
const listeners = new Set<(e: { matches: boolean }) => void>();

beforeEach(() => {
  installMatchMedia(false);
  listeners.clear();
});
afterEach(() => cleanup());

describe('useMediaQuery', () => {
  it('restituisce false quando la query non matcha', () => {
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(false);
  });

  it('restituisce true quando la query matcha', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(true);
  });

  it('si aggiorna quando matchMedia cambia (rotazione device)', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(false);
    act(() => {
      currentMatches = true;
      listeners.forEach((cb) => cb({ matches: true }));
    });
    expect(result.current).toBe(true);
  });
});

describe('useIsMobile', () => {
  it('è false su viewport desktop', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('è true sotto il breakpoint lg (1024px)', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

describe('App — layout mobile', () => {
  it('mostra il FAB controlli e la sheet con la lista pianeti', async () => {
    installMatchMedia(true);
    const App = (await import('../App')).default;
    render(<App />);
    // Nota: il FAB è individuabile via classe (il suo accessible name
    // "☰ Controlli" collide con il bottone "Chiudi pannello controlli").
    const fab = document.querySelector('button.mobile-fab') as HTMLButtonElement;
    expect(fab).not.toBeNull();
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    // La lista pianeti è sempre montata (anche a sheet chiusa)
    expect(
      screen.getAllByRole('button', {
        name: /^(Mercurio|Venere|Terra|Marte|Giove|Saturno|Urano|Nettuno)$/i,
      }).length
    ).toBeGreaterThanOrEqual(8);
  });

  it('apre e chiude la bottom sheet col FAB', async () => {
    installMatchMedia(true);
    const App = (await import('../App')).default;
    render(<App />);
    const fab = document.querySelector('button.mobile-fab') as HTMLButtonElement;
    fireEvent.click(fab);
    expect(fab).toHaveAttribute('aria-expanded', 'true');
    const sheet = document.getElementById('controls-sheet');
    expect(sheet).toHaveClass('open');
    fireEvent.click(fab);
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(sheet).not.toHaveClass('open');
  });

  it('il pannello info su mobile è una bottom sheet (inset-x-0 bottom-0)', async () => {
    installMatchMedia(true);
    const App = (await import('../App')).default;
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^Terra$/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /Informazioni su Terra/i });
    expect(dialog.className).toContain('inset-x-0');
    expect(dialog.className).toContain('bottom-0');
  });

  it('il menu "⋯" su mobile raccoglie anche i toggle nascosti', async () => {
    installMatchMedia(true);
    const App = (await import('../App')).default;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /altre opzioni/i }));
    expect(screen.getByRole('menuitem', { name: /Realismo/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Etichette/i })).toBeInTheDocument();
  });
});
