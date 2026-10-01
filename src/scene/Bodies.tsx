/**
 * <Bodies /> — pianeti 3D come sfere texturizzate illuminate dal Sole.
 * Posizioni aggiornate imperativamente dal `positionsRef` (useOrbitEngine).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Color, AdditiveBlending, BackSide, SphereGeometry } from 'three';
import { useTexture } from '@react-three/drei';
import { BODIES_3D, BODIES_ORDER, angleToOrbitPosition } from './bodies3d';
import type { SimPlanetState } from '../hooks/useOrbitEngine';
import { useOrbitEngineContext } from './OrbitEngineBridge';

export function Bodies({ selectedBodyName,
  onSelectBody,
 }: {  selectedBodyName: string | null; onSelectBody: (n: string) => void }) {
  const { positionsRef } = useOrbitEngineContext();
  const bodiesNoSun = BODIES_ORDER.filter((n) => n !== 'Sun');
  const textures = useTexture(bodiesNoSun.map((n) => BODIES_3D[n].map!));

  const meshRefs = useRef<Record<string, Mesh | null>>({});
  const groupRefs = useRef<Record<string, import('three').Group | null>>({});

  const geometries = useMemo(
    () =>
      bodiesNoSun.reduce<Record<string, SphereGeometry>>((acc, n) => {
        acc[n] = new SphereGeometry(BODIES_3D[n].radius, 48, 48);
        return acc;}, {}),
    []
  );
  const mats = useMemo(
    () =>
      bodiesNoSun.reduce<Record<string, MeshStandardMaterial>>((acc, n, i) => {
        acc[n] = new MeshStandardMaterial({ map: textures[i], roughness: 0.85, metalness: 0.05 });
        return acc;
      }, {}),
    [textures]
  );

  useFrame((_, dt) => {
    const pos = positionsRef.current;
    for (const name of bodiesNoSun) {
      const m = meshRefs.current[name];
      const g = groupRefs.current[name];
      const body = BODIES_3D[name];
      if (!m || !g) continue;
      const p: SimPlanetState | undefined = pos[name];
      if (!p) continue;
      const v = angleToOrbitPosition(p.angle, body.orbitDistance);
      g.position.copy(v);
      m.rotation.y += (dt * 360) / body.rotationHours;
    }
  });

  return (
    <group>
      {bodiesNoSun.map((name) => {
        const body = BODIES_3D[name];
        const isSelected = name === selectedBodyName;
        return (
          <group
            key={name}
            ref={(el) => {
              groupRefs.current[name] = el;
            }}
          >
            <group rotation={[0, 0, (body.axialTilt * Math.PI) / 180]}>
              <mesh
                ref={(el) => {
                  meshRefs.current[name] = el;
                }}
                geometry={geometries[name]}
                material={mats[name]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBody(name);
                }}
                onPointerOver={(e) => {
                  document.body.style.cursor = 'pointer';
                  e.stopPropagation();
                }}
                onPointerOut={() => {
                  document.body.style.cursor = '';
                }}
                scale={isSelected ? 1.15 : 1.0}
              />
            </group>
            {isSelected && (
              <mesh scale={1.6}>
                <sphereGeometry args={[body.radius, 32, 32]} />
                <meshBasicMaterial
                  color={new Color('#a855f7')}
                  transparent
                  opacity={0.2}
                  side={BackSide}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}