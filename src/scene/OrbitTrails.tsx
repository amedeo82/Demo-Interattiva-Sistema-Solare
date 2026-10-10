/**
 * <OrbitTrails /> — scie orbitali dietro ai pianeti "interessanti"
 * (selezionato o hovered). Per ogni corpo tiene un buffer circolare di
 * N posizioni passate e lo renderizza come una polyline con colore
 * decrescente (testa opaca → coda sfumata viola).
 *
 * Le posizioni sono derivate da keplerPosition per lo stesso `simTime`
 * che il motore sta usando: questo mantiene la scia allineata con la
 * traiettoria reale del pianeta anche durante pause/seek.
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
} from 'three';
import type { PlanetData } from '../data/planets';
import { keplerPosition } from '../hooks/useOrbitEngine';
import { useOrbitEngineContext } from './OrbitEngineBridge';

const TRAIL_SEGMENTS = 96;
const TRAIL_DURATION_S = 60;

const HEAD_COLOR = new Color('#c4b5fd');
const TAIL_COLOR = new Color('#7c3aed');

export interface OrbitTrailsProps {
  planets: PlanetData[];
  /** Nomi dei pianeti a cui applicare la scia. */
  names: string[];
}

interface TrailEntry {
  planet: PlanetData;
  line: Line;
  geom: BufferGeometry;
  mat: LineBasicMaterial;
}

function buildTrail(planet: PlanetData): TrailEntry {
  const positions = new Float32Array(TRAIL_SEGMENTS * 3);
  const colors = new Float32Array(TRAIL_SEGMENTS * 3);
  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    const t = i / (TRAIL_SEGMENTS - 1);
    // i=0 = testa (più chiaro), i=last = coda (più scuro)
    const c = HEAD_COLOR.clone().lerp(TAIL_COLOR, 1 - t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setAttribute('color', new BufferAttribute(colors, 3));
  const mat = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const line = new Line(geom, mat);
  line.frustumCulled = false;
  return { planet, line, geom, mat };
}

export function OrbitTrails({ planets, names }: OrbitTrailsProps) {
  const { simTimeRef } = useOrbitEngineContext();

  const trails: TrailEntry[] = useMemo(() => {
    return names
      .map((name) => planets.find((p) => p.name === name))
      .filter((p): p is PlanetData => !!p)
      .map(buildTrail);
  }, [planets, names]);

  useEffect(() => {
    return () => {
      // Cleanup GPU: dispose geometries/material quando il componente smonta.
      for (const t of trails) {
        t.geom.dispose();
        t.mat.dispose();
      }
    };
  }, [trails]);

  useFrame(() => {
    const tNow = simTimeRef.current;
    for (const { planet, geom } of trails) {
      const arr = geom.getAttribute('position').array as Float32Array;
      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        // i=0 = posizione corrente (testa), i=last = posizione più vecchia
        const tBack = ((TRAIL_SEGMENTS - 1 - i) / (TRAIL_SEGMENTS - 1)) * TRAIL_DURATION_S;
        const t = tNow - tBack;
        const pos = keplerPosition(planet, t);
        const rad = (pos.angle * Math.PI) / 180;
        arr[i * 3] = pos.radius * Math.sin(rad);
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = pos.radius * Math.cos(rad);
      }
      geom.getAttribute('position').needsUpdate = true;
    }
  });

  return (
    <group>
      {trails.map((t) => (
        <primitive key={t.planet.name} object={t.line} />
      ))}
    </group>
  );
}
