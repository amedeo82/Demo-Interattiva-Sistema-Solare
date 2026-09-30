/**
 * Fascia principale degli asteroidi tra Marte e Giove.
 *
 * Genera ~350 rocce con distribuzione radiale gaussiana (2.1–3.3 UA
 * scalate sulla simulazione), inclinazioni casuali e velocità angolari
 * secondo la 3ª legge di Keplero (periodo ∝ a^1.5). La generazione è
 * deterministica (PRNG con seed) così ogni render è stabile.
 *
 * Ottimizzazione 60fps: i nodi SVG sono creati UNA volta dal JSX; a ogni
 * frame il motore scrive gli attributi cx/cy direttamente sui elementi
 * (batch in un singolo loop), evitando il re-render React di ~350 figli.
 */
import { useEffect, useMemo, useRef } from 'react';
import { mulberry32 } from '../utils/random';
import { EARTH_DEG_PER_SIM_SEC } from '../config';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface Asteroid {
  angle: number; // gradi iniziali
  radius: number; // px dal Sole
  size: number; // px
  speed: number; // moltiplicatore angolare relativo alla Terra
  opacity: number;
}

export function generateAsteroids(count = 350, seed = 42): Asteroid[] {
  const rand = mulberry32(seed);
  const list: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    // somma di due uniformi ≈ distribuzione triangolare attorno al centro fascia
    const u = (rand() + rand()) / 2;
    const radius = 186 + u * 26; // tra orbita di Marte (166) e Giove (216)
    const aAU = radius / 130; // semi-asse in "UA di simulazione" (Terra = 130px)
    const periodYears = Math.pow(aAU, 1.5); // 3ª legge di Keplero
    list.push({
      angle: rand() * 360,
      radius,
      size: 1 + rand() * 1.6,
      speed: 1 / periodYears,
      opacity: 0.25 + rand() * 0.5,
    });
  }
  return list;
}

interface Props {
  /** Abbonamento al flusso di frame del motore orbitale. */
  subscribeFrames: (
    l: (positions: Record<string, SimPlanetState>, t: number) => void
  ) => () => void;
}

/** Velocità angolare terrestre condivisa (CONFIG: 360° / 10s di simulazione a 1x) */
const earthDegPerSec = EARTH_DEG_PER_SIM_SEC;

export default function AsteroidBelt({ subscribeFrames }: Props) {
  const asteroids = useMemo(() => generateAsteroids(), []);
  const nodesRef = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(
    () =>
      subscribeFrames((_positions, simTime) => {
        // Pre-computiamo il termine temporale comune fuori dal loop.
        const base = earthDegPerSec * simTime;
        for (let i = 0; i < asteroids.length; i++) {
          const el = nodesRef.current[i];
          if (!el) continue;
          const ast = asteroids[i];
          const rad = ((ast.angle + base * ast.speed) * Math.PI) / 180;
          el.setAttribute('cx', String(ast.radius * Math.sin(rad)));
          el.setAttribute('cy', String(-ast.radius * Math.cos(rad)));
        }
      }),
    [subscribeFrames, asteroids]
  );

  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width={520}
      height={520}
      viewBox="-260 -260 520 520"
      aria-hidden="true"
    >
      {asteroids.map((ast, i) => (
        <circle
          key={i}
          ref={(el) => {
            nodesRef.current[i] = el;
          }}
          cx={ast.radius * Math.sin((ast.angle * Math.PI) / 180)}
          cy={-ast.radius * Math.cos((ast.angle * Math.PI) / 180)}
          r={ast.size}
          fill="#b9a58c"
          opacity={ast.opacity}
        />
      ))}
    </svg>
  );
}
