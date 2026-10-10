/**
 * <Moons /> — lune 3D orbitanti attorno ai pianeti.
 *
 * Dati da `PlanetData.moons` (vedi `data/planets.ts`). Ogni luna orbita
 * attorno al pianeta genitore con un periodo proprio (in secondi di
 * simulazione), letto da `simTimeRef` (per coerenza con la slow-mo
 * cinematografica e con la velocità di simulazione).
 *
 * L'illuminazione è gestita dal `pointLight` globale in `Lighting.tsx`,
 * quindi le lune mostrano naturalmente il terminatore (lato giorno / lato
 * notte) senza shader custom.
 *
 * NB: le lune non hanno `BODIES_3D` (non seguono la kepleriana del
 * pianeta): qui l'orbita è circolare semplificata — sufficiente per dare
 * il "senso di presenza" e rendere la scena più viva.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, SphereGeometry, Group, Vector3 } from 'three';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import { BODIES_3D, REAL_SCALE_FACTOR, angleToOrbitPosition } from './bodies3d';
import { planets } from '../data/planets';
import type { MoonData } from '../data/planets';

interface MoonEntry {
  name: string;
  parent: string;
  radius: number;
  size: number;
  /** Periodo orbitale in secondi di simulazione. */
  period: number;
  color: string;
  /** Angolo iniziale (fase) — derivato dal nome per determinismo. */
  initialAngle: number;
}

function hashAngle(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

const MOON_LIST: MoonEntry[] = planets.flatMap((p) =>
  p.moons.map((m: MoonData) => ({
    name: m.name,
    parent: p.name,
    radius: m.orbitRadius,
    size: m.size,
    period: m.period,
    color: m.color,
    initialAngle: hashAngle(m.name),
  }))
);

const tmpVec = new Vector3();

export function Moons({
  realScale = false,
  eclipsesEnabled = false,
}: {
  realScale?: boolean;
  eclipsesEnabled?: boolean;
} = {}) {
  const { positionsRef, simTimeRef } = useOrbitEngineContext();
  const groupRefs = useRef<Record<string, Group | null>>({});
  const meshRefs = useRef<Record<string, Mesh | null>>({});

  // Crea geometry/material per ogni luna (fuori dal declarative tree r3f).
  const geometries = useMemo(
    () => MOON_LIST.reduce<Record<string, SphereGeometry>>((acc, m) => {
      acc[m.name] = new SphereGeometry(m.size, 16, 16);
      return acc;
    }, {}),
    []
  );
  const materials = useMemo(
    () =>
      MOON_LIST.reduce<Record<string, MeshStandardMaterial>>((acc, m) => {
        acc[m.name] = new MeshStandardMaterial({
          color: m.color,
          roughness: 0.95,
          metalness: 0.02,
        });
        return acc;
      }, {}),
    []
  );

  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((mat) => mat.dispose());
    },
    [geometries, materials]
  );

  useFrame(() => {
    const simTime = simTimeRef.current;
    for (const m of MOON_LIST) {
      const grp = groupRefs.current[m.name];
      const parent = positionsRef.current[m.parent];
      if (!grp || !parent) continue;
      // 4.8 — coerente con Bodies: in `realScale` la posizione del pianeta
      // genitore è in AU × REAL_SCALE_FACTOR (lineare), fuori in unità
      // logaritmiche compresse.
      // 4.9 — Ω del pianeta genitore orienta l'orbita della luna.
      const parentBody = BODIES_3D[m.parent];
      const parentDist = realScale
        ? (parentBody?.distanceAu ?? 0) * REAL_SCALE_FACTOR
        : parent.radius;
      const angle = m.initialAngle + (simTime / m.period) * 360;
      angleToOrbitPosition(
        parent.angle,
        parentDist,
        tmpVec,
        parentBody?.longitudeOfAscendingNode
      );
      grp.position.copy(tmpVec);
      // Posiziona la luna attorno al pianeta genitore (offset angolare).
      // Anche il raggio orbitale della luna scala con la modalità corrente.
      const moonOrbit = m.radius * (realScale ? REAL_SCALE_FACTOR : 1);
      const orbitX = Math.sin((angle * Math.PI) / 180) * moonOrbit;
      const orbitZ = -Math.cos((angle * Math.PI) / 180) * moonOrbit;
      grp.position.x += orbitX;
      grp.position.z += orbitZ;
      // Piccola inclinazione casuale (±2°) per non rendere tutto piatto.
      const tilt = (hashAngle(m.name + 't') / 180 - 1) * 0.035;
      grp.position.y = Math.sin((angle * Math.PI) / 180) * moonOrbit * tilt;
    }
  });

  // Raggruppa per pianeta genitore per non duplicare la posizione del
  // pianeta nel DOM (è solo 1 lookup per pianeta invece di 8 lune × 8 pianeti).
  return (
    <group>
      {MOON_LIST.map((m) => (
        <group
          key={m.name}
          ref={(el) => {
            groupRefs.current[m.name] = el;
          }}
        >
          <mesh
            ref={(el) => {
              meshRefs.current[m.name] = el;
            }}
            geometry={geometries[m.name]}
            material={materials[m.name]}
            castShadow={eclipsesEnabled}
            receiveShadow={eclipsesEnabled}
            // Click non intercettato dal raycaster (Bodies ha già l'evento):
            // lasciamo che le lune siano trasparenti per l'hover.
            raycast={() => null}
          />
        </group>
      ))}
    </group>
  );
}

// Esportiamo anche la lista per usi futuri (es. tooltip, contatori).
export const MOON_COUNT = MOON_LIST.length;
