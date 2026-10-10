/**
 * LoadingProvider: condivide lo stato di avanzamento del caricamento della
 * scena 3D dal Canvas al DOM. Vive dentro <Canvas> (drei useProgress richiede
 * R3F context) e pubblica { progress, ready } su un event bus che il DOM può
 * sottoscriversi.
 */
import { useProgress } from '@react-three/drei';
import { useEffect, useState, type ReactNode } from 'react';

export interface LoadingState {
  progress: number;
  ready: boolean;
}

const listeners = new Set<(s: LoadingState) => void>();
let currentState: LoadingState = { progress: 0, ready: false };
function publish(s: LoadingState) {
  currentState = s;
  listeners.forEach((l) => l(s));
}

export function subscribeLoading(l: (s: LoadingState) => void): () => void {
  listeners.add(l);
  l(currentState);
  return () => listeners.delete(l);
}

export function getLoading(): LoadingState {
  return currentState;
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { progress, active } = useProgress();
  const ready = !active && progress >= 100;
  useEffect(() => {
    publish({ progress, ready });
  }, [progress, ready]);
  return <>{children}</>;
}

export function useLoadingState(): LoadingState {
  const [s, setS] = useState<LoadingState>(currentState);
  useEffect(() => subscribeLoading(setS), []);
  return s;
}
