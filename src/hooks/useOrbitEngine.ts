/**
 * Motore di animazione basato su requestAnimationFrame.
 *
 * Rispetto alle animazioni CSS (che si "resettano" cambiando durata o
 * pausando), questo motore mantiene una simulazione continua con tempo
 * accumulato: pause, cambi di velocità e ri-render non causano scatti.
 *
 * Ritorna gli angoli orbitali correnti (in gradi) per ogni pianeta.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanetData } from '../data/planets';

export interface SimulationState {
  /** Angolo corrente in gradi per ogni pianeta (chiave = planet.name). */
  angles: Record<string, number>;
}

/** Offset iniziale sfalsato: orbitRadius e periodo sono correlati
 *  (3ª legge di Keplero), quindi tutti partirebbero allineati in cima. */
const START_ANGLES: Record<string, number> = {
  Mercury: 40,
  Venus: 160,
  Earth: 300,
  Mars: 95,
  Jupiter: 220,
  Saturn: 15,
  Uranus: 135,
  Neptune: 260,
};

/** Velocità angolare in gradi/secondo a speed=1. */
function angularSpeed(planet: PlanetData): number {
  return 360 / planet.animationDuration;
}

export function useOrbitEngine(planets: PlanetData[], isPlaying: boolean, speed: number) {
  // Tempo simulato accumulato (secondi a speed=1), sopravvive ai cambi di speed
  const simTimeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const [angles, setAngles] = useState<Record<string, number>>(() =>
    Object.fromEntries(planets.map((p) => [p.name, START_ANGLES[p.name] ?? 0]))
  );

  // Keep refs of current planets for stable loop
  const planetsRef = useRef(planets);
  planetsRef.current = planets;

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }
    let rafId = 0;
    const tick = (now: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = now;
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.1); // clamp tab-inattivo
      lastFrameRef.current = now;
      simTimeRef.current += dt * speedRef.current;

      const t = simTimeRef.current;
      const next: Record<string, number> = {};
      for (const p of planetsRef.current) {
        const base = START_ANGLES[p.name] ?? 0;
        next[p.name] = (base + angularSpeed(p) * t) % 360;
      }
      setAngles(next);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return useMemo(() => ({ angles }), [angles]);
}
