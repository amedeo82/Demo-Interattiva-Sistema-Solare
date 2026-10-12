/**
 * <Conjunctions /> — sistema di rilevamento congiunzioni fra pianeti.
 *
 * Una congiunzione è definita come due pianeti che, visti dal Sole, hanno
 * la stessa longitudine eliocentrica entro una soglia angolare (default
 * 5°). Il componente calcola la coppia "più stretta" a ogni frame e la
 * notifica in due modi:
 *   - DOM: un banner overlay al centro basso con i nomi dei pianeti e la
 *     separazione angolare corrente.
 *   - 3D: un anello luminoso viola attorno alla coppia, visibile nella
 *     scena.
 *
 * La soglia di isteresi (3° per uscire dallo stato "in congiunzione")
 * evita flicker quando l'angolo oscilla attorno al limite.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { keplerPosition } from '../hooks/useOrbitEngine';
import { planets as PLANETS_DATA } from '../data/planets';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import { BODIES_3D, angularSeparation3D, heliocentricVector3D } from './bodies3d';

const ENTRY_THRESHOLD_DEG = 5; // soglia per entrare in "in congiunzione"
const EXIT_THRESHOLD_DEG = 3; // soglia per uscirne (isteresi)

interface Conjunction {
  a: string;
  b: string;
  /** Angolo minimo osservato durante l'evento corrente (gradi). */
  bestSep: number;
  /** Quando è iniziata (ms reali). */
  startMs: number;
}

interface ConjunctionsProps {
  /** Callback per aggiornare l'overlay DOM con la congiunzione corrente. */
  onChange?: (c: Conjunction | null) => void;
}

export function Conjunctions({ onChange }: ConjunctionsProps) {
  const { simTimeRef } = useOrbitEngineContext();
  const groupRef = useRef<Group | null>(null);
  const ringRef = useRef<Mesh | null>(null);

  const currentRef = useRef<Conjunction | null>(null);
  const lastEmitRef = useRef<number>(0);

  // Anello 3D di highlight: stessa RingGeometry usata da Orbits, ma con
  // colore viola e additive blending.
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#a855f7'),
        transparent: true,
        opacity: 0.6,
        blending: AdditiveBlending,
        side: 2, // DoubleSide
        depthWrite: false,
      }),
    []
  );
  const ringGeom = useMemo(() => new RingGeometry(0.95, 1.0, 64), []);

  useEffect(() => {
    return () => {
      ringGeom.dispose();
      ringMat.dispose();
    };
  }, [ringGeom, ringMat]);

  useFrame(() => {
    const t = simTimeRef.current;
    // S9 · M9 — Calcola la coppia più stretta usando la separazione
    // angolare 3D (inclusiva di i e Ω). I vettori sono ricalcolati ad
    // ogni frame via `heliocentricVector3D`; il costo è trascurabile
    // (28 coppie × 2 vettori = 56 calcoli trigonometrici per frame).
    let best: { a: string; b: string; sep: number; mid: number } | null = null;
    for (let i = 0; i < PLANETS_DATA.length; i++) {
      for (let j = i + 1; j < PLANETS_DATA.length; j++) {
        const pa = PLANETS_DATA[i];
        const pb = PLANETS_DATA[j];
        const sa = keplerPosition(pa, t);
        const sb = keplerPosition(pb, t);
        // Vettori 3D (log scale; per la separazione angolare la scala
        // è ininfluente, conta solo la direzione)
        const ba = BODIES_3D[pa.name];
        const bb = BODIES_3D[pb.name];
        if (!ba || !bb) continue;
        const va = heliocentricVector3D(
          sa.angle,
          sa.radius,
          ba.longitudeOfAscendingNode,
          ba.orbitalInclination
        );
        const vb = heliocentricVector3D(
          sb.angle,
          sb.radius,
          bb.longitudeOfAscendingNode,
          bb.orbitalInclination
        );
        const sep = angularSeparation3D(va, vb);
        if (!best || sep < best.sep) {
          // posizione "media" sulla congiunzione (a metà strada)
          const mid = (sa.radius + sb.radius) / 2;
          best = { a: pa.name, b: pb.name, sep, mid };
        }
      }
    }
    if (!best) return;

    const current = currentRef.current;
    const inSame = current && current.a === best.a && current.b === best.b;
    if (inSame) {
      // Aggiorna bestSep e timestamp
      if (best.sep < current.bestSep) current.bestSep = best.sep;
    } else if (best.sep <= ENTRY_THRESHOLD_DEG) {
      // Nuova congiunzione entrante
      currentRef.current = {
        a: best.a,
        b: best.b,
        bestSep: best.sep,
        startMs: performance.now(),
      };
    } else if (current && best.sep > EXIT_THRESHOLD_DEG) {
      // Uscita
      currentRef.current = null;
    }

    // Aggiorna marker 3D: mostra l'anello solo se c'è una congiunzione
    // attiva. Posizione: a metà strada fra i due pianeti (in 3D, con i e Ω).
    if (groupRef.current) {
      const c = currentRef.current;
      groupRef.current.visible = !!c;
      if (c) {
        const pa = PLANETS_DATA.find((p) => p.name === c.a)!;
        const pb = PLANETS_DATA.find((p) => p.name === c.b)!;
        const sa = keplerPosition(pa, t);
        const sb = keplerPosition(pb, t);
        const ba = BODIES_3D[pa.name];
        const bb = BODIES_3D[pb.name];
        if (!ba || !bb) return;
        const va = heliocentricVector3D(
          sa.angle,
          sa.radius,
          ba.longitudeOfAscendingNode,
          ba.orbitalInclination
        );
        const vb = heliocentricVector3D(
          sb.angle,
          sb.radius,
          bb.longitudeOfAscendingNode,
          bb.orbitalInclination
        );
        const mx = (va.x + vb.x) / 2;
        const my = (va.y + vb.y) / 2;
        const mz = (va.z + vb.z) / 2;
        const scale = Math.max(sa.radius, sb.radius) * 0.6;
        groupRef.current.position.set(mx, my, mz);
        if (ringRef.current) {
          ringRef.current.scale.set(scale, scale, 1);
          // Lampeggio leggero
          const pulse = 0.5 + 0.3 * Math.sin(performance.now() * 0.005);
          ringMat.opacity = 0.4 + pulse * 0.4;
        }
      }
    }

    // Throttle DOM emission a 2Hz
    const now = performance.now();
    if (now - lastEmitRef.current > 500) {
      lastEmitRef.current = now;
      const snapshot = currentRef.current ? { ...currentRef.current } : null;
      onChange?.(snapshot);
      emitConjunction(snapshot);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={ringRef} geometry={ringGeom} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

export interface ConjunctionInfo {
  a: string;
  b: string;
  bestSep: number;
  startMs: number;
}

/** Hook DOM-side: legge lo stato corrente delle congiunzioni. */
export function useConjunctionState(): ConjunctionInfo | null {
  const [info, setInfo] = useState<ConjunctionInfo | null>(null);
  // Il componente 3D chiama onChange (vedi <Conjunctions>): noi
  // semplicemente ci registriamo a un piccolo event bus.
  useEffect(() => subscribeConjunction(setInfo), []);
  return info;
}

// Event bus minimale
const conjunctionListeners = new Set<(c: ConjunctionInfo | null) => void>();
export function emitConjunction(c: ConjunctionInfo | null) {
  conjunctionListeners.forEach((l) => l(c));
}
export function subscribeConjunction(l: (c: ConjunctionInfo | null) => void): () => void {
  conjunctionListeners.add(l);
  return () => {
    conjunctionListeners.delete(l);
  };
}
