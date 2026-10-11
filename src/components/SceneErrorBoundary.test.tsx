/**
 * S8 · M1 — Test per SceneErrorBoundary.
 *
 * Verifica:
 *  - il boundary non interferisce con il rendering normale
 *  - cattura errori del child e mostra il fallback
 *  - il bottone "Riprova" resetta lo stato e rimonta il child
 *  - il bottone "Ricarica pagina" chiama window.location.reload
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneErrorBoundary } from './SceneErrorBoundary';

// Child che lancia al primo render, controllato da prop.
function Boom({ shouldThrow }: { shouldThrow: boolean }): null {
  if (shouldThrow) throw new Error('Boom dal child di test');
  return null;
}

describe('SceneErrorBoundary', () => {
  // Sopprime il log di errore React per test puliti.
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockReset();
  });

  it('renderizza i children quando non ci sono errori', () => {
    render(
      <SceneErrorBoundary>
        <div data-testid="child">controllo</div>
      </SceneErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('cattura un errore del child e mostra il fallback', () => {
    render(
      <SceneErrorBoundary>
        <Boom shouldThrow={true} />
      </SceneErrorBoundary>
    );
    const fallback = screen.getByTestId('scene-error-boundary');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent(/scena 3d non disponibile/i);
    // Il messaggio dell'errore è mostrato in <pre>
    expect(fallback).toHaveTextContent(/boom dal child di test/i);
  });

  it('"Riprova" resetta lo stato di errore', () => {
    // Un throw al primo mount, poi non più throw al re-render.
    const shouldThrowRef = { current: true };
    function Toggle(): null {
      if (shouldThrowRef.current) throw new Error('prima esplosione');
      return null;
    }
    const { rerender } = render(
      <SceneErrorBoundary>
        <Toggle />
      </SceneErrorBoundary>
    );
    expect(screen.getByTestId('scene-error-boundary')).toBeInTheDocument();
    shouldThrowRef.current = false;
    // Clic su "Riprova" → rimonta il child (key++) e adesso non lancia
    fireEvent.click(screen.getByRole('button', { name: /riprova/i }));
    // Forza re-render: l'errore è stato resettato, il child renderizza ok
    rerender(
      <SceneErrorBoundary>
        <Toggle />
      </SceneErrorBoundary>
    );
    expect(screen.queryByTestId('scene-error-boundary')).not.toBeInTheDocument();
  });

  it('"Ricarica pagina" chiama window.location.reload', () => {
    const reloadMock = vi.fn();
    // jsdom non consente di ridefinire `location.reload` direttamente:
    // sostituiamo l'intera `window.location` con un mock che espone reload.
    const originalLocation = window.location;
    // @ts-expect-error — mock intenzionale di Location per test
    delete window.location;
    // @ts-expect-error — mock intenzionale
    window.location = { reload: reloadMock };
    try {
      render(
        <SceneErrorBoundary>
          <Boom shouldThrow={true} />
        </SceneErrorBoundary>
      );
      fireEvent.click(screen.getByRole('button', { name: /ricarica pagina/i }));
      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-expect-error — ripristino
      window.location = originalLocation;
    }
  });

  it('espone role="alert" sul fallback per screen reader', () => {
    render(
      <SceneErrorBoundary>
        <Boom shouldThrow={true} />
      </SceneErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
