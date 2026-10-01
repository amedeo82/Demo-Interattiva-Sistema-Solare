/**
 * <SaturnRings /> — anelli di Saturno (RingGeometry + texture procedurale).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RingGeometry, MeshBasicMaterial, DoubleSide, Vector3 as V3 } from 'three';
import { useTexture } from '@react-three/drei';
import { BODIES_3D, angleToOrbitPosition } from './bodies3d';
import { useOrbitEngineContext } from './OrbitEngineBridge';

const SATURN = BODIES_3D.Saturn;
const INNER = SATURN.radius * 1.24;
const OUTER = SATURN.radius * 2.27;

export function SaturnRings() {
  const { positionsRef } = useOrbitEngineContext();
  const groupRef = useRef<import('three').Group>(null);
  const ringTex = useTexture(SATURN.rings!);

  const geom = useMemo(() => new RingGeometry(INNER, OUTER, 128, 8), []);
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
    const v: V3 = angleToOrbitPosition(pos.angle, SATURN.orbitDistance);
    groupRef.current.position.copy(v);
  });

  return (
    <group
      ref={groupRef}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh geometry={geom} material={mat} />
    </group>
  );
}