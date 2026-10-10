/**
 * <PlanetRings /> — anelli sottili per Urano e Nettuno.
 *
 * Per Saturno vedi <SaturnRings /> (texture NASA reale). Qui gestiamo i
 * due giganti di ghiaccio, le cui texture degli anelli non sono incluse
 * nella collezione Solar System Scope e vengono quindi generate
 * proceduralmente (vedi `proceduralTextures.ts`).
 *
 * NB: l'orientamento "verticale" di Urano (tilt 98°, "rotolamento")
 * emerge naturalmente dall'applicazione dello stesso `axialTilt` del
 * pianeta al group esterno — gli anelli restano sempre nel piano
 * equatoriale.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RingGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Group,
  Texture,
} from 'three';
import { BODIES_3D, REAL_SCALE_FACTOR, angleToOrbitPosition } from './bodies3d';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import {
  makeUranusRingsTexture,
  makeNeptuneRingsTexture,
} from '../utils/proceduralTextures';

type RingPlanet = 'Uranus' | 'Neptune';

const CONFIGS: Record<RingPlanet, { inner: number; outer: number }> = {
  Uranus: { inner: 1.55, outer: 1.95 },
  Neptune: { inner: 1.4, outer: 1.7 },
};

function SinglePlanetRings({
  planet,
  realScale,
}: {
  planet: RingPlanet;
  realScale: boolean;
}) {
  const config = CONFIGS[planet];
  const body = BODIES_3D[planet];
  const inner = body.radius * config.inner;
  const outer = body.radius * config.outer;
  const tilt = (body.axialTilt * Math.PI) / 180;
  const { positionsRef } = useOrbitEngineContext();
  const groupRef = useRef<Group | null>(null);

  // Texture procedurale (cached per mount).
  const ringTex: Texture | null = useMemo(
    () => (planet === 'Uranus' ? makeUranusRingsTexture() : makeNeptuneRingsTexture()),
    [planet]
  );

  // Geometria: RingGeometry con UV radiali (u = raggio normalizzato).
  const geom = useMemo(() => {
    const g = new RingGeometry(inner, outer, 128, 8);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const tmp = { x: 0, y: 0 };
    for (let i = 0; i < pos.count; i++) {
      tmp.x = pos.getX(i);
      tmp.y = pos.getY(i);
      const r = Math.sqrt(tmp.x * tmp.x + tmp.y * tmp.y);
      const u = (r - inner) / (outer - inner);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, [inner, outer]);

  const mat = useMemo(() => {
    if (!ringTex) return null;
    return new MeshBasicMaterial({
      map: ringTex,
      transparent: true,
      alphaTest: 0.01,
      side: DoubleSide,
      depthWrite: false,
    });
  }, [ringTex]);

  useFrame(() => {
    const grp = groupRef.current;
    if (!grp) return;
    const pos = positionsRef.current[planet];
    if (!pos) return;
    const dist = realScale ? body.distanceAu * REAL_SCALE_FACTOR : body.orbitDistance;
    angleToOrbitPosition(
      pos.angle,
      dist,
      grp.position,
      body.longitudeOfAscendingNode
    );
  });

  if (!mat) return null;

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, tilt]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geom} material={mat} />
        </group>
      </group>
    </group>
  );
}

export function PlanetRings({ realScale = false }: { realScale?: boolean } = {}) {
  return (
    <group>
      <SinglePlanetRings planet="Uranus" realScale={realScale} />
      <SinglePlanetRings planet="Neptune" realScale={realScale} />
    </group>
  );
}
