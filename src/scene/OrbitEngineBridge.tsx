/**
 * <OrbitEngineBridge /> — passa il `positionsRef` del motore orbitale ai
 * figli dentro <Canvas>. Il motore continua a vivere in App.tsx; qui
 * esponiamo SOLO il ref alle posizioni, letto dentro `useFrame`.
 */
import { createContext, useContext, useMemo } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export type PositionsRef = MutableRefObject<Record<string, SimPlanetState>>;
export type SimRateRef = MutableRefObject<number>;
export type SimTimeRef = MutableRefObject<number>;

const Ctx = createContext<{
  positionsRef: PositionsRef;
  simRateRef: SimRateRef;
  simTimeRef: SimTimeRef;
} | null>(null);

export function useOrbitEngineContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrbitEngineContext must be inside <OrbitEngineBridge>');
  return v;
}

export function OrbitEngineBridge({
  positionsRef,
  simRateRef,
  simTimeRef,
  children,
}: {
  positionsRef: PositionsRef;
  simRateRef: SimRateRef;
  simTimeRef: SimTimeRef;
  children: ReactNode;
}) {
  // S15 · M9-audit — memoizza il value del Context. Senza useMemo, ogni
  // render di OrbitEngineBridge crea un nuovo oggetto, invalidando
  // TUTTI i consumer (SolarScene, Bodies, Moons, Orbits, ecc.) e
  // facendoli re-renderizzare inutilmente. I ref sono stabili quindi
  // le dipendenze di useMemo sono costanti.
  const value = useMemo(
    () => ({ positionsRef, simRateRef, simTimeRef }),
    [positionsRef, simRateRef, simTimeRef]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
