/**
 * S8 · M1 — Test per ContextLostGuard.
 *
 * Verifica:
 *  - il listener `webglcontextlost` chiama `preventDefault` e setta lost=true
 *  - il listener `webglcontextrestored` resetta lost=false
 *  - l'overlay viene mostrato in un portale nel body quando lost=true
 *  - i listener vengono rimossi al cleanup (unmount)
 *
 * Il componente usa `useThree` di R3F: in jsdom lo mockiamo con un
 * `gl.domElement` finto (un HTMLElement con addEventListener).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

// Mock di useThree che restituisce un `gl` con un domElement finto.
const listeners: Record<string, EventListener[]> = {};
const fakeCanvas = {
  addEventListener: (type: string, fn: EventListener) => {
    (listeners[type] ||= []).push(fn);
  },
  removeEventListener: (type: string, fn: EventListener) => {
    if (listeners[type]) listeners[type] = listeners[type].filter((f) => f !== fn);
  },
  dispatchEvent: () => {
    // Non usato; gli eventi li lanciamo direttamente sui listener registrati.
    return true;
  },
};
vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (s: { gl: { domElement: typeof fakeCanvas } }) => unknown) =>
    selector({ gl: { domElement: fakeCanvas } }),
}));

import { ContextLostGuard } from './ContextLostGuard';

function fireOn(type: string, event: Event): void {
  for (const fn of listeners[type] || []) fn(event);
}

describe('ContextLostGuard', () => {
  beforeEach(() => {
    for (const k of Object.keys(listeners)) delete listeners[k];
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('registra listener su webglcontextlost e webglcontextrestored', () => {
    render(<ContextLostGuard />);
    expect(listeners.webglcontextlost?.length).toBe(1);
    expect(listeners.webglcontextrestored?.length).toBe(1);
  });

  it('mostra overlay quando il contesto è perso', () => {
    render(<ContextLostGuard />);
    act(() => {
      fireOn('webglcontextlost', new Event('webglcontextlost'));
    });
    const overlay = document.querySelector('[data-testid="context-lost-overlay"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveTextContent(/contesto grafico perso/i);
  });

  it('chiama preventDefault sul webglcontextlost (richiesto dalla spec)', () => {
    render(<ContextLostGuard />);
    const evt = new Event('webglcontextlost', { cancelable: true });
    act(() => {
      fireOn('webglcontextlost', evt);
    });
    expect(evt.defaultPrevented).toBe(true);
  });

  it('rimuove overlay al webglcontextrestored', () => {
    render(<ContextLostGuard />);
    act(() => {
      fireOn('webglcontextlost', new Event('webglcontextlost'));
    });
    expect(document.querySelector('[data-testid="context-lost-overlay"]')).toBeInTheDocument();
    act(() => {
      fireOn('webglcontextrestored', new Event('webglcontextrestored'));
    });
    expect(document.querySelector('[data-testid="context-lost-overlay"]')).not.toBeInTheDocument();
  });

  it('rimuove i listener al unmount', () => {
    const { unmount } = render(<ContextLostGuard />);
    expect(listeners.webglcontextlost?.length).toBe(1);
    unmount();
    expect(listeners.webglcontextlost?.length ?? 0).toBe(0);
    expect(listeners.webglcontextrestored?.length ?? 0).toBe(0);
  });
});
