/**
 * Hook che conta quante orbite complete ogni pianeta ha compiuto da
 * quando il componente è stato montato. Usa un ref per non causare
 * re-render ad ogni frame; il counter viene esposto come ref.
 *
 * Rileva un wrap-around (l'angolo passa da 359° a 0°) come "1 orbita".
 */
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface OrbitCounters {
  [bodyName: string]: number;
}

export type OrbitCountersRef = MutableRefObject<OrbitCounters>;

/** Hook: traccia le orbite e popola la mappa imperativamente. */
export function useOrbitCounters(
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>,
  bodyNames: string[]
): OrbitCountersRef {
  const countersRef = useRef<OrbitCounters>({});
  const lastAngleRef = useRef<Record<string, number>>({});

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
            continue;
          }
          // Wrap-around: l'angolo passa da ~360° a ~0° (avanti) o viceversa (indietro).
          // Viene contato se |diff| > 180°.
          const d = pos.angle - last;
          if (d > 180) {
            countersRef.current[name] = (countersRef.current[name] ?? 0) + 1;
          } else if (d < -180) {
            // moto retrogrado (Venere, Urano)
            countersRef.current[name] = (countersRef.current[name] ?? 0) + 1;
          }
          lastAngleRef.current[name] = pos.angle;
        }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positionsRef, bodyNames]);

  return countersRef;
}