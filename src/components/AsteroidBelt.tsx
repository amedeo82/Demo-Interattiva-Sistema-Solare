/**
 * Fascia principale degli asteroidi tra Marte e Giove.
 *
 * Genera ~350 rocce con distribuzione radiale gaussiana (2.1–3.3 UA
 * scalate sulla simulazione), inclinazioni casuali e velocità angolari
 * secondo la 3ª legge di Keplero (periodo ∝ a^1.5). La generazione è
 * deterministica (PRNG con seed) così ogni render è stabile.
 */
import { useMemo } from 'react';

export interface Asteroid {
  angle: number; // gradi iniziali
  radius: number; // px dal Sole
  size: number; // px
  speed: number; // moltiplicatore angolare relativo alla Terra
  opacity: number;
}

/** PRNG mulberry32: deterministico e veloce. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
  /** Tempo simulato accumulato (secondi a 1x). */
  simTime: number;
}

export default function AsteroidBelt({ simTime }: Props) {
  const asteroids = useMemo(() => generateAsteroids(), []);
  // Velocità angolare terrestre: 360° / 10s di simulazione a 1x
  const earthDegPerSec = 360 / 10;
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width={520}
      height={520}
      viewBox="-260 -260 520 520"
      aria-hidden="true"
    >
      {asteroids.map((ast, i) => {
        const deg = ast.angle + earthDegPerSec * ast.speed * simTime;
        const rad = (deg * Math.PI) / 180;
        const x = ast.radius * Math.sin(rad);
        const y = -ast.radius * Math.cos(rad);
        return (
          <circle key={i} cx={x} cy={y} r={ast.size} fill="#b9a58c" opacity={ast.opacity} />
        );
      })}
    </svg>
  );
}
