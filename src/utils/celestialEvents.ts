/**
 * S11 · F2 — Calcolo eventi celesti (congiunzioni, opposizioni, transiti).
 *
 * Funzioni pure che, dato un range di date e il dataset pianeti, restituiscono
 * una lista di eventi. Il sampling è adattivo: passo grosso (1 giorno) +
 * raffinamento con sezione aurea intorno ai minimi.
 *
 * **Limite di precisione**: il modello kepleriano semplificato con
 * anomalie medie J2000 diverge da JPL Horizons di ~0.5° su date recenti.
 * Le tolleranze dei test sono generose per riflettere questo limite.
 */
import { planets } from '../data/planets';
import { angularSeparation3D, BODIES_3D, heliocentricVector3D } from '../scene/bodies3d';
import { keplerPosition } from '../hooks/useOrbitEngine';
import { meanLongitudeAt } from './kepler';
import { simTimeForDate } from './simDate';
import { Vector3 } from 'three';

export type EventKind = 'conjunction' | 'opposition' | 'transit';

export interface CelestialEvent {
  kind: EventKind;
  a: string;
  b?: string; // solo per congiunzioni
  date: Date;
  /** Separazione angolare minima (gradi). Per opposizioni ≈ 0 (elongazione). */
  separationDeg: number;
  /** Per i transiti: 0 = centro del disco solare. */
  solarSeparationDeg?: number;
}

/**
 * Trova i minimi locali di `f(x)` nell'intervallo `[a, b]` campionando
 * con passo `step` (giorni). Per ogni minimo candidato, esegue un
 * raffinamento con sezione aurea fino a tolleranza 0.01°.
 */
function findMinima(a: Date, b: Date, stepDays: number, f: (date: Date) => number): Date[] {
  const ms = stepDays * 86_400_000;
  const candidates: { date: Date; f: number }[] = [];
  let t = a.getTime();
  const end = b.getTime();
  while (t <= end) {
    const d = new Date(t);
    candidates.push({ date: d, f: f(d) });
    t += ms;
  }
  // Identifica minimi locali: f[i] < f[i-1] e f[i] < f[i+1]
  const minima: { date: Date; f: number }[] = [];
  for (let i = 1; i < candidates.length - 1; i++) {
    if (candidates[i].f < candidates[i - 1].f && candidates[i].f < candidates[i + 1].f) {
      minima.push(candidates[i]);
    }
  }
  // Raffinamento con sezione aurea (±10 giorni)
  const PHI = (Math.sqrt(5) - 1) / 2;
  for (const m of minima) {
    const d0 = m.date.getTime();
    const lo = d0 - 10 * 86_400_000;
    const hi = d0 + 10 * 86_400_000;
    let a1 = lo;
    let b1 = hi;
    let c1 = b1 - PHI * (b1 - a1);
    let d1 = a1 + PHI * (b1 - a1);
    const fA = (x: number) => f(new Date(x));
    for (let i = 0; i < 30; i++) {
      if (fA(c1) < fA(d1)) {
        b1 = d1;
      } else {
        a1 = c1;
      }
      c1 = b1 - PHI * (b1 - a1);
      d1 = a1 + PHI * (b1 - a1);
      if (b1 - a1 < 0.01 * 86_400_000) break; // 0.01 giorni = ~0.01° con velocità tipica
    }
    m.date = new Date((a1 + b1) / 2);
    m.f = f(m.date);
  }
  return minima.map((m) => m.date);
}

/**
 * S11 · F2 — Trova le congiunzioni planetarie nel range indicato.
 *
 * Una congiunzione è una separazione angolare minima (vista dal Sole)
 * fra due pianeti. Il campionamento è di 1 giorno (raffinamento aureo).
 *
 * Restituisce gli eventi ordinati per data.
 */
export function findConjunctions(
  from: Date,
  to: Date,
  options: { minSepDeg?: number; maxSepDeg?: number } = {}
): CelestialEvent[] {
  const minSep = options.minSepDeg ?? 0;
  const maxSep = options.maxSepDeg ?? 10;
  const earth = planets.find((p) => p.name === 'Earth');
  if (!earth) return [];
  const events: CelestialEvent[] = [];
  // Itera su coppie
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const pa = planets[i];
      const pb = planets[j];
      const sepAt = (date: Date): number => {
        const t = simTimeForDate(earth, date, planets);
        const sa = keplerPosition(pa, t);
        const sb = keplerPosition(pb, t);
        const ba = BODIES_3D[pa.name];
        const bb = BODIES_3D[pb.name];
        if (!ba || !bb) return 180;
        const va = heliocentricVector3D(
          sa.angle,
          sa.radius,
          ba.longitudeOfAscendingNode,
          ba.orbitalInclination,
          new Vector3()
        );
        const vb = heliocentricVector3D(
          sb.angle,
          sb.radius,
          bb.longitudeOfAscendingNode,
          bb.orbitalInclination,
          new Vector3()
        );
        return angularSeparation3D(va, vb);
      };
      const minima = findMinima(from, to, 1, sepAt);
      for (const date of minima) {
        const sep = sepAt(date);
        if (sep >= minSep && sep <= maxSep) {
          events.push({ kind: 'conjunction', a: pa.name, b: pb.name, date, separationDeg: sep });
        }
      }
    }
  }
  events.sort((x, y) => x.date.getTime() - y.date.getTime());
  return events;
}

/**
 * S11 · F2 — Trova le opposizioni (elongazione geocentrica ≈ 180°) nel range.
 *
 * Un pianeta è in opposizione quando la differenza di longitudine eliocentrica
 * fra esso e la Terra è ≈ 180° (visto dal Sole). Modello semplificato:
 * usiamo la differenza di longitudine media.
 */
export function findOppositions(from: Date, to: Date): CelestialEvent[] {
  const earth = planets.find((p) => p.name === 'Earth');
  if (!earth) return [];
  const events: CelestialEvent[] = [];
  for (const planet of planets) {
    if (planet.name === 'Earth' || planet.name === 'Sun') continue;
    const elongAt = (date: Date): number => {
      const lamEarth = meanLongitudeAt(earth.meanLongitudeJ2000, earth.orbitalPeriod, date);
      const lamPlanet = meanLongitudeAt(planet.meanLongitudeJ2000, planet.orbitalPeriod, date);
      // Elongazione vista dal Sole = differenza di longitudine
      let diff = Math.abs(lamPlanet - lamEarth) % 360;
      if (diff > 180) diff = 360 - diff;
      return diff; // minima elongazione quando pianeta in opposizione
    };
    // Per le opposizioni cerchiamo i MASSIMI di elongazione (≈ 180°)
    const ms = 1 * 86_400_000;
    const candidates: { date: Date; elong: number }[] = [];
    let t = from.getTime();
    const end = to.getTime();
    while (t <= end) {
      const d = new Date(t);
      candidates.push({ date: d, elong: elongAt(d) });
      t += ms;
    }
    for (let i = 1; i < candidates.length - 1; i++) {
      if (
        candidates[i].elong > candidates[i - 1].elong &&
        candidates[i].elong > candidates[i + 1].elong &&
        candidates[i].elong > 170 // soglia: opposizione entro 10° da 180°
      ) {
        events.push({
          kind: 'opposition',
          a: planet.name,
          date: candidates[i].date,
          separationDeg: 180 - candidates[i].elong, // distanza da opposizione esatta
        });
      }
    }
  }
  events.sort((x, y) => x.date.getTime() - y.date.getTime());
  return events;
}

/**
 * Label localizzata di un evento (usata da EventsModal e dai marker
 * della timeline). La traduzione è demandata al chiamante via callback
 * `t(key, vars)`, come nel resto dell'app.
 */
export function eventLabel(
  e: CelestialEvent,
  t: (k: string, vars?: Record<string, string | number>) => string
): string {
  if (e.kind === 'conjunction') return t('events.conjunction', { a: e.a, b: e.b ?? '' });
  return t('events.opposition', { a: e.a });
}
