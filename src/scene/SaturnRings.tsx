/**
 * <SaturnRings /> — anelli di Saturno (RingGeometry + texture procedurale).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RingGeometry, MeshBasicMaterial, DoubleSide, SRGBColorSpace } from 'three';
import { useTexture } from '@react-three/drei';
import { BODIES_3D, REAL_SCALE_FACTOR, angleToOrbitPosition } from './bodies3d';
import { useOrbitEngineContext } from './OrbitEngineBridge';

const SATURN = BODIES_3D.Saturn;
const INNER = SATURN.radius * 1.24;
const OUTER = SATURN.radius * 2.27;
const TILT = (SATURN.axialTilt * Math.PI) / 180;

export function SaturnRings({ realScale = false }: { realScale?: boolean } = {}) {
  const { positionsRef } = useOrbitEngineContext();
  const groupRef = useRef<import('three').Group>(null);
  const ringTex = useTexture(SATURN.rings!);
  ringTex.colorSpace = SRGBColorSpace;

  // RingGeometry ha UV planari (basate su posizione x,y), ma la texture è
  // una striscia RADIALE (2048×64): serve u = raggio normalizzato, così le
  // bande appaiono come anelli concentrici invece di artefatti specchiati.
  const geom = useMemo(() => {
    const g = new RingGeometry(INNER, OUTER, 128, 8);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const tmp = { x: 0, y: 0 };
    for (let i = 0; i < pos.count; i++) {
      tmp.x = pos.getX(i);
      tmp.y = pos.getY(i);
      const r = Math.sqrt(tmp.x * tmp.x + tmp.y * tmp.y);
      const u = (r - INNER) / (OUTER - INNER);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        alphaTest: 0.01,
        side: DoubleSide,
        depthWrite: false,
      }),
    [ringTex]
  );

  useFrame(() => {
    const pos = positionsRef.current['Saturn'];
    if (!pos || !groupRef.current) return;
    const dist = realScale ? SATURN.distanceAu * REAL_SCALE_FACTOR : SATURN.orbitDistance;
    angleToOrbitPosition(
      pos.angle,
      dist,
      groupRef.current.position,
      SATURN.longitudeOfAscendingNode
    );
  });

  return (
    <group ref={groupRef}>
      {/* Stesso tilt assiale del pianeta (applicato in Bodies come
          rotazione z): senza, gli anelli attraversano i poli. */}
      <group rotation={[0, 0, TILT]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geom} material={mat} />
        </group>
      </group>
    </group>
  );
}
