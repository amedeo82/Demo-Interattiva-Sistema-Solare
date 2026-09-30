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
import { normalizeDeg, orbitalRadiusPx, solveKepler, trueAnomalyFromEccentric } from '../utils/kepler';

export interface SimPlanetState {
  /** Longitudine eliocentrica corrente in gradi (0° = in alto, senso orario). */
  angle: number;
  /** Raggio corrente in px (variabile con l'eccentricità kepleriana). */
  radius: number;
}

export interface SimulationState {
  /** Stato orbitale corrente per ogni pianeta (chiave = planet.name). */
  positions: Record<string, SimPlanetState>;
  /** Tempo simulato accumulato in "secondi a 1x". */
  simTime: number;
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

/** Velocità angolare media in gradi/secondo di simulazione a speed=1. */
function angularSpeed(planet: PlanetData): number {
  return 360 / planet.animationDuration;
}

/**
 * Posizione kepleriana di un pianeta dato il tempo simulato.
 *
 * Semplificazione: l'asse maggiore di ogni ellisse è allineato con la
 * direzione iniziale del pianeta nel modello. L'anomalia media M avanza a
 * velocità costante; da M si ricava l'anomalia eccentrica E (equazione di
 * Keplero) e quindi l'anomalia vera ν, che dà la longitudine visibile.
 * Il raggio segue l'ellisse polare r(ν) = a(1-e²)/(1+e·cos ν).
 */
export function keplerPosition(
  planet: PlanetData,
  t: number,
  startAngleDeg = START_ANGLES[planet.name] ?? 0
): SimPlanetState {
  const meanAnomaly = normalizeDeg(startAngleDeg + angularSpeed(planet) * t);
  const ecc = planet.eccentricity ?? 0;
  const E = solveKepler(meanAnomaly - startAngleDeg, ecc);
  const nu = trueAnomalyFromEccentric(E, ecc);
  // longitudine visibile = direzione dell'asse + anomalia vera
  const angle = normalizeDeg(startAngleDeg + nu);
  const radius = orbitalRadiusPx(planet.orbitRadius, ecc, nu);
  return { angle, radius };
}

/**
 * Motore di animazione basato su requestAnimationFrame.
 *
 * Rispetto alle animazioni CSS (che si "resettano" cambiando durata o
 * pausando), questo motore mantiene una simulazione continua con tempo
 * accumulato: pause, cambi di velocità e ri-render non causano scatti.
 *
 * Si possono sovrascrivere gli angoli iniziali (es. per una data storica)
 * tramite `initialAngles`: al variare di quest'ultimo la simulazione
 * riparte dagli offset forniti senza perdere il loop rAF.
 */
export function useOrbitEngine(
  planets: PlanetData[],
  isPlaying: boolean,
  speed: number,
  initialAngles?: Record<string, number>,
  startSimTime = 0
) {
  // Tempo simulato accumulato (secondi a speed=1), sopravvive ai cambi di speed
  const simTimeRef = useRef(startSimTime);
  const lastFrameRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const starts = initialAngles ?? START_ANGLES;

  const computeAll = useMemo(() => {
    return (t: number): Record<string, SimPlanetState> => {
      const next: Record<string, SimPlanetState> = {};
      for (const p of planets) {
        next[p.name] = keplerPosition(p, t, starts[p.name] ?? 0);
      }
      return next;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets, starts]);

  const [state, setState] = useState<SimulationState>(() => ({
    positions: computeAll(simTimeRef.current),
    simTime: simTimeRef.current,
  }));

  // Keep refs of current planets for stable loop
  const planetsRef = useRef(planets);
  planetsRef.current = planets;
  const computeRef = useRef(computeAll);
  computeRef.current = computeAll;

  // Quando cambia l'epoca di partenza (es. selezione di una data), riposiziona
  // la simulazione sul tempo corrispondente e ri-calcola subito le posizioni.
  useEffect(() => {
    simTimeRef.current = startSimTime;
    setState({ positions: computeRef.current(startSimTime), simTime: startSimTime });
  }, [startSimTime, computeAll]);

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
      setState({ positions: computeRef.current(simTimeRef.current), simTime: simTimeRef.current });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return state;
}
