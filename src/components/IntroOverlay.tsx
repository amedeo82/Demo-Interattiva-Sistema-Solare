/**
 * <IntroOverlay /> — title sequence cinematografico al primo mount.
 *
 * Mostra un titolo "Sistema Solare" con fade-in, una barra di progresso
 * real-time del caricamento della scena 3D (pubblicata da LoadingProvider
 * dentro il Canvas), poi un fade-out. La sequenza termina quando entrambe:
 *   - la scena ha segnalato `ready === true`
 *   - sono passati almeno `minVisibleMs` (così il titolo è leggibile anche
 *     su macchine veloci dove useProgress completa in <16ms).
 */
import { useEffect, useState } from 'react';
import { useLoadingState, subscribeLoading, getLoading } from '../scene/LoadingProvider';

export interface IntroOverlayProps {
  /** ms minimi di permanenza del titolo (default 1500). */
  minVisibleMs?: number;
  /** ms di durata del fade-out (default 1200). */
  fadeMs?: number;
  onComplete?: () => void;
}

export function IntroOverlay({
  minVisibleMs = 1500,
  fadeMs = 1200,
  onComplete,
}: IntroOverlayProps) {
  const [phase, setPhase] = useState<'in' | 'visible' | 'out' | 'done'>('in');
  const loading = useLoadingState();
  const progress = Math.round(loading.progress);

  useEffect(() => {
    const start = performance.now();
    const t1 = setTimeout(() => setPhase('visible'), 30);
    const checkAndAdvance = () => {
      const elapsed = performance.now() - start;
      const l = getLoading();
      if (l.ready && elapsed >= minVisibleMs) {
        setPhase('out');
        setTimeout(() => {
          setPhase('done');
          onComplete?.();
        }, fadeMs);
        return true;
      }
      return false;
    };
    const interval = setInterval(() => {
      if (checkAndAdvance()) clearInterval(interval);
    }, 100);
    const off = subscribeLoading((s) => {
      if (s.ready && performance.now() - start >= minVisibleMs) {
        if (checkAndAdvance()) {
          off();
          clearInterval(interval);
        }
      }
    });
    return () => {
      clearTimeout(t1);
      clearInterval(interval);
      off();
    };
  }, [minVisibleMs, fadeMs, onComplete]);

  if (phase === 'done') return null;

  const opacity = phase === 'in' ? 0 : phase === 'visible' ? 1 : 0;
  const transitionMs = phase === 'in' ? 600 : phase === 'out' ? fadeMs : 0;
  const showBar = phase === 'in' || phase === 'visible';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/30"
      style={{
        opacity,
        transition: `opacity ${transitionMs}ms ease-out`,
      }}
      aria-hidden
    >
      <h1 className="font-display text-4xl font-bold tracking-[0.3em] text-white drop-shadow-lg md:text-6xl">
        Sistema Solare
      </h1>
      <p
        className="mt-3 text-sm tracking-[0.5em] text-white/70 md:text-base"
        style={{
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'opacity 800ms ease-out 200ms',
        }}
      >
        Interattivo · 3D
      </p>
      {showBar && (
        <div
          className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-white/10"
          style={{
            opacity: phase === 'visible' ? 1 : 0,
            transition: 'opacity 600ms ease-out 400ms',
          }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-300"
            style={{
              width: `${progress}%`,
              transition: 'width 200ms ease-out',
            }}
          />
        </div>
      )}
    </div>
  );
}
