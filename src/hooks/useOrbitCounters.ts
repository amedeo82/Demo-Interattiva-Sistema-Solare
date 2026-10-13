/**
 * Hook che conta quante orbite complete ogni pianeta ha compiuto da
 * quando il componente è stato montato. Usa un ref per non causare
 * re-render ad ogni frame; il counter viene esposto come ref.
 *
 * Rileva un wrap-around (l'angolo passa da 359° a 0°) come "1 orbita".
 *
 * S15 — espone anche `progress` (0-1): quanto manca all'orbita successiva
 * (1.0 = orbita appena completata, 0.0 = wrap imminente). Usato dal
 * PlanetInfoPanel per mostrare "Orbite di Terra 3 (0.42/1)" invece di
 * un secco "3" che non dà feedback durante l'anno in corso.
 */
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface OrbitCounters {
  [bodyName: string]: number;
}

export interface OrbitProgress {
  /** Numero di orbite complete (incrementa al wrap-around). */
  count: number;
  /** Frazione 0..1 dell'orbita in corso. 1 = appena completata. */
  fraction: number;
}

export type OrbitCountersRef = MutableRefObject<OrbitCounters>;
export type OrbitProgressRef = MutableRefObject<Record<string, OrbitProgress>>;

/** Hook: traccia le orbite e popola la mappa imperativamente.
 *  Ritorna sia il counter "grezzo" (retro-compat) sia il progress. */
export function useOrbitCounters(
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>,
  bodyNames: string[]
): { counters: OrbitCountersRef; progress: OrbitProgressRef } {
  const countersRef = useRef<OrbitCounters>({});
  const lastAngleRef = useRef<Record<string, number>>({});
  const startAngleRef = useRef<Record<string, number>>({});
  const progressRef = useRef<Record<string, OrbitProgress>>({});

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const positions = positionsRef.current;
      for (const name of bodyNames) {
        const pos = positions[name];
        if (!pos) continue;
        const last = lastAngleRef.current[name];
        // Inizializzazione alla prima lettura
        if (last === undefined) {
          lastAngleRef.current[name] = pos.angle;
          startAngleRef.current[name] = pos.angle;
          progressRef.current[name] = { count: 0, fraction: 0 };
          continue;
        }
        // Wrap-around: l'angolo passa da ~360° a ~0° (avanti) o viceversa (indietra).
        // Viene contato se |diff| > 180°.
        const d = pos.angle - last;
        if (Math.abs(d) > 180) {
          countersRef.current[name] = (countersRef.current[name] ?? 0) + 1;
          // Nuova orbita: riparti da dove siamo ora (frazione 0).
          startAngleRef.current[name] = pos.angle;
          progressRef.current[name] = { count: countersRef.current[name], fraction: 0 };
        } else {
          // Frazione 0..1 di orbita completata dall'ultimo wrap.
          const start = startAngleRef.current[name] ?? pos.angle;
          const rawDiff = pos.angle - start;
          // Normalizziamo in [0, 360) prendendo il valore assoluto:
          // Venere/Urano retrogradi "contano" lo stesso (vedono l'orbita
          // completarsi comunque). L'utente vede l'avanzamento dell'orbita
          // in ogni caso.
          const diff = ((Math.abs(rawDiff) % 360) + 360) % 360;
          const fraction = Math.min(1, diff / 360);
          progressRef.current[name] = {
            count: countersRef.current[name] ?? 0,
            fraction,
          };
        }
        lastAngleRef.current[name] = pos.angle;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positionsRef, bodyNames]);

  return { counters: countersRef, progress: progressRef };
}
