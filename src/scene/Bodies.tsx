/**
 * <Bodies /> — pianeti 3D come sfere texturizzate illuminate dal Sole.
 * Posizioni aggiornate imperativamente dal `positionsRef` (useOrbitEngine).
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Mesh,
  MeshStandardMaterial,
  Color,
  AdditiveBlending,
  BackSide,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { BODIES_3D, BODIES_ORDER, angleToOrbitPosition } from './bodies3d';
import type { SimPlanetState } from '../hooks/useOrbitEngine';
import { useOrbitEngineContext } from './OrbitEngineBridge';

export function Bodies({
  selectedBodyName,
  onSelectBody,
}: {
  selectedBodyName: string | null;
  onSelectBody: (n: string) => void;
}) {
  const { positionsRef, simRateRef } = useOrbitEngineContext();
  const { gl } = useThree();
  const bodiesNoSun = BODIES_ORDER.filter((n) => n !== 'Sun');
  const textures = useTexture(bodiesNoSun.map((n) => BODIES_3D[n].map!));
  // Upgrade asset: nubi terrestri (mappa in scala di grigi, usata come alphaMap).
  const earthCloudsTex = useTexture('/textures/planets/earth_clouds.png');
  // Le texture JPG sono sRGB: senza colorSpace esplicito three le tratta
  // come dati lineari → colori slavati che non corrispondono al pianeta reale.
  useEffect(() => {
    for (const t of textures) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      t.needsUpdate = true;
    }
    earthCloudsTex.colorSpace = SRGBColorSpace;
    earthCloudsTex.anisotropy = gl.capabilities.getMaxAnisotropy();
    earthCloudsTex.needsUpdate = true;
  }, [textures, earthCloudsTex, gl]);

  const cloudMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffffff',
        alphaMap: earthCloudsTex,
        transparent: true,
        depthWrite: false,
        roughness: 1,
      }),
    [earthCloudsTex]
  );
  const cloudRefs = useRef<Record<string, Mesh | null>>({});

  const meshRefs = useRef<Record<string, Mesh | null>>({});
  const groupRefs = useRef<Record<string, import('three').Group | null>>({});
  const tmpVec = useMemo(() => new Vector3(), []);

  const geometries = useMemo(
    () =>
      bodiesNoSun.reduce<Record<string, SphereGeometry>>((acc, n) => {
        acc[n] = new SphereGeometry(BODIES_3D[n].radius, 48, 48);
        return acc;
      }, {}),
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

  const cloudGeom = useMemo(() => new SphereGeometry(BODIES_3D.Earth.radius * 1.02, 48, 48), []);

  // Cleanup GPU alla dismissione (le geometry/material sono fuori dal
  // declarative tree di r3f, quindi vanno dispose a mano).
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      cloudGeom.dispose();
      cloudMat.dispose();
    },
    [geometries, mats, cloudGeom, cloudMat]
  );

  useFrame((_, dt) => {
    const pos = positionsRef.current;
    const simRate = simRateRef.current;
    for (const name of bodiesNoSun) {
      const m = meshRefs.current[name];
      const g = groupRefs.current[name];
      const body = BODIES_3D[name];
      if (!m || !g) continue;
      const p: SimPlanetState | undefined = pos[name];
      if (!p) continue;
      angleToOrbitPosition(p.angle, body.orbitDistance, tmpVec);
      g.position.copy(tmpVec);
      // Rotazione assiale proporzionale alla velocità di simulazione
      // (prima usava il tempo reale: a 0.25x girava troppo veloce,
      // a 10x troppo lento rispetto all'orbita).
      m.rotation.y += (dt * simRate * 360) / body.rotationHours;
      // Le nubi terrestri derivano leggermente rispetto alla superficie.
      const c = cloudRefs.current[name];
      if (c) c.rotation.y += (dt * simRate * 360) / (body.rotationHours * 0.92);
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
              {name === 'Earth' && (
                <mesh
                  ref={(el) => {
                    cloudRefs.current[name] = el;
                  }}
                  geometry={cloudGeom}
                  material={cloudMat}
                />
              )}
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
