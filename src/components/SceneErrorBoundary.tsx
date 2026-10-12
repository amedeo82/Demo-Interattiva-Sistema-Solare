/**
 * S8 · M1 — Error boundary per la scena 3D.
 *
 * Cattura eccezioni provenienti dal `<Canvas>` R3F (es. WebGL init
 * fallito, throw in `useFrame` di un componente) e mostra un pannello
 * di recovery invece di lasciare l'app in uno stato con canvas vuoto.
 *
 * Non sostituisce la `<Suspense>` di loading: il boundary gestisce solo
 * errori, non il caricamento lazy. Viene wrappato attorno a `<Suspense>`
 * in `App.tsx` (sopra), così:
 *   - caricamento → Suspense fallback
 *   - eccezione  → boundary fallback
 *   - entrambi   → boundary fallback (prevale)
 *
 * Bottone "Riprova" incrementa una `key` sul boundary, forzando il
 * remount dell'albero; "Ricarica pagina" esegue `location.reload()`.
 */
import { Component, type ReactNode } from 'react';

interface SceneErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryKey: number;
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = {
    hasError: false,
    error: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<SceneErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }): void {
    // Log diagnostico: non include dati utente, solo stack React + messaggio.
    // eslint-disable-next-line no-console
    console.error('[SceneErrorBoundary] scena 3D in errore:', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }));
    this.props.onRetry?.();
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      // La `key` cambia solo quando hasError era true ed è stato resettato,
      // così al retry il Canvas viene completamente rimontato.
      return (
        <div key={this.state.retryKey} className="absolute inset-0">
          {this.props.children}
        </div>
      );
    }
    return (
      <div
        role="alert"
        className="surface glass absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 p-6 text-center"
        data-testid="scene-error-boundary"
      >
        <div className="text-3xl" aria-hidden>
          🌑
        </div>
        <h2 className="font-display text-lg text-white">Scena 3D non disponibile</h2>
        <p className="max-w-sm text-sm text-white/75">
          Si è verificato un errore nel rendering della scena. Questo può accadere se il browser non
          supporta WebGL o se le risorse GPU sono limitate.
        </p>
        {this.state.error && (
          <p className="max-w-md font-mono text-[11px] text-white/65">{this.state.error.message}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md bg-purple-500/20 px-3 py-1.5 text-sm text-white hover:bg-purple-500/30"
          >
            🔄 Riprova
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 hover:bg-white/5"
          >
            Ricarica pagina
          </button>
        </div>
      </div>
    );
  }
}
