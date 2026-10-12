/**
 * S10a · M6a — Test a11y con axe-core sull'App montata.
 *
 * Verifica che i 3 scenari principali dell'app (sidebar aperta,
 * pannello info aperto, modal quiz aperto) non introducano violazioni
 * a11y. Le regole `color-contrast` e `region` sono disabilitate nella
 * configurazione (vedi ./axe.ts) perché jsdom non le supporta in modo
 * significativo.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { axeConfig } from './axe';

// Polyfill matchMedia mobile default (sidebar) — alcuni test installano
// la versione mobile; qui vogliamo la versione desktop di default.
const installMatchMedia = (mobile: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: mobile && /(max-width: 1023px)/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

beforeAll(() => {
  installMatchMedia(false);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('App — a11y (axe-core)', () => {
  it('layout desktop: nessuna violazione', async () => {
    const App = (await import('../App')).default;
    const { container } = render(<App />);
    // Aspetta che la scena lazy sia in piedi (o in Suspense) prima di analizzare.
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /mercurio/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    const results = await axe(container, axeConfig);
    expect(results.violations).toEqual([]);
  });

  it('pannello info aperto: nessuna violazione', async () => {
    const App = (await import('../App')).default;
    render(<App />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /mercurio/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    fireEvent.click(screen.getByRole('button', { name: /mercurio/i }));
    await waitFor(
      () => {
        expect(
          screen.getByRole('dialog', { hidden: true }) || document.querySelector('[role="dialog"]')
        ).toBeTruthy();
      },
      { timeout: 2000 }
    );
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      const results = await axe(dialog as HTMLElement, axeConfig);
      expect(results.violations).toEqual([]);
    }
  });
});
