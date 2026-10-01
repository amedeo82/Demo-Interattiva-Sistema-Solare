/**
 * <OrbitEngineBridge /> — passa il `positionsRef` del motore orbitale ai
 * figli dentro <Canvas>. Il motore continua a vivere in App.tsx; qui
 * esponiamo SOLO il ref alle posizioni, letto dentro `useFrame`.
 */
import { createContext, useContext } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export type PositionsRef = MutableRefObject<Record<string, SimPlanetState>>;

const Ctx = createContext<{ positionsRef: PositionsRef } | null>(null);

export function useOrbitEngineContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrbitEngineContext must be inside <OrbitEngineBridge>');
  return v;
}

export function OrbitEngineBridge({
  positionsRef,
  children,
}: {
  positionsRef: PositionsRef;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ positionsRef }}>{children}</Ctx.Provider>;
}