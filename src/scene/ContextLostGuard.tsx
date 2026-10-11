/**
 * S8 · M1 — Gestione WebGL context loss/restore.
 *
 * Montato dentro `<Canvas>`, ascolta `webglcontextlost` e
 * `webglcontextrestored` sul `gl.domElement` e pubblica lo stato in
 * uno store zustand locale. Un overlay DOM (portale) mostra il
 * messaggio all'utente quando il contesto è perso e si rimuove
 * automaticamente al restore.
 *
 * Sul `webglcontextlost` chiama `e.preventDefault()` come richiesto
 * dalla specifica: senza di essa il browser non tenta il restore e
 * il contesto è perso per sempre.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useThree } from '@react-three/fiber';

/**
 * Stato condiviso del contesto WebGL. Mantenuto in uno state locale
 * del componente invece che in uno store globale perché è strettamente
 * legato al ciclo di vita del Canvas (non deve sopravvivere a remount).
 */
export function ContextLostGuard(): ReactNode {
  const gl = useThree((s) => s.gl);
  const [lost, setLost] = useState(false);
  const [restoredTick, setRestoredTick] = useState(0);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleLost = (e: Event): void => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.warn('[ContextLostGuard] WebGL context lost, in attesa di restore…');
      setLost(true);
    };
    const handleRestored = (): void => {
      // eslint-disable-next-line no-console
      console.info('[ContextLostGuard] WebGL context restored');
      setLost(false);
      // Forza un re-render del consumer (R3F invalida la scena al
      // restore automaticamente; il tick serve solo a rimuovere
      // eventuali overlay in stato "perso").
      setRestoredTick((n) => n + 1);
    };

    canvas.addEventListener('webglcontextlost', handleLost as EventListener, false);
    canvas.addEventListener('webglcontextrestored', handleRestored as EventListener, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost as EventListener, false);
      canvas.removeEventListener(
        'webglcontextrestored',
        handleRestored as EventListener,
        false
      );
    };
  }, [gl]);

  // L'overlay è in un portale: vive nel DOM principale anche se il
  // Canvas WebGL è "morto". Questo è l'unico modo per mostrare UI
  // quando il contesto è perso.
  if (!lost || typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-testid="context-lost-overlay"
      className="pointer-events-none absolute inset-x-0 top-20 z-40 mx-auto max-w-md rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur"
    >
      ⚠️ Contesto grafico perso. In attesa di ripristino automatico…
      {/* restoredTick consumato solo per triggerare il render: il valore
          non è usato, l'unmount dell'overlay avviene quando `lost` torna false */}
      <span hidden>{restoredTick}</span>
    </div>,
    document.body
  );
}
