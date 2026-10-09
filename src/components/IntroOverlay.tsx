/**
 * <IntroOverlay /> — title sequence cinematografico al primo mount.
 *
 * Mostra S: un titolo "Sistema Solare Interattivo" che sfuma in (fade-in)
 * rimane visibile per ~1.5s, poi sfuma via. Total ~3s per matchare l'intro
 * flythrough della camera (vedi CameraAnimator). Il titolo è posizionato
 * sopra al canvas via z-index (DOM puro) e non interferisce con la scena 3D.
 */
import { useEffect, useState } from 'react';

export interface IntroOverlayProps {
  /** ms dopo cui iniziare il fade-out. Default 1500. */
  visibleMs?: number;
  /** ms di durata del fade-out. Default 1200. */
  fadeMs?: number;
  onComplete?: () => void;
}

export function IntroOverlay({ visibleMs = 1500, fadeMs = 1200, onComplete }: IntroOverlayProps) {
  const [phase, setPhase] = useState<'in' | 'visible' | 'out' | 'done'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 30);
    const t2 = setTimeout(() => setPhase('out'), visibleMs);
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, visibleMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [visibleMs, fadeMs, onComplete]);

  if (phase === 'done') return null;

  const opacity = phase === 'in' ? 0 : phase === 'visible' ? 1 : 0;
  const transitionMs = phase === 'in' ? 600 : phase === 'out' ? fadeMs : 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/30"
      style={{
        opacity,
        transition: `opacity ${transitionMs}ms ease-out`,
      }}
      aria-hidden
    >
      <h1 className="text-4xl font-bold tracking-[0.3em] text-white drop-shadow-lg md:text-6xl">
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
    </div>
  );
}
