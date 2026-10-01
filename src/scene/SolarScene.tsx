/**
 * <SolarScene /> — wrapper del <Canvas /> react-three-fiber.
 * Sostituisce il vecchio rendering DOM-only.
 */
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Suspense } from 'react';
import type { MutableRefObject } from 'react';
import { Bodies } from './Bodies';
import { Orbits } from './Orbits';
import { Lighting } from './Lighting';
import { Sun3D } from './Sun3D';
import { StarsBackground } from './StarsBackground';
import { CameraRig } from './CameraRig';
import { PostProcessing } from './PostProcessing';
import { OrbitEngineBridge } from './OrbitEngineBridge';
import { SaturnRings } from './SaturnRings';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface SolarSceneProps {
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>;
  selectedBodyName: string | null;
  onSelectBody: (name: string) => void;
  postFxEnabled: boolean;
  tiltRef: MutableRefObject<{ pitch: number; yaw: number }>;
}

export function SolarScene({
  positionsRef,
  selectedBodyName,
  onSelectBody,
  postFxEnabled,
  tiltRef,
}: SolarSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 70, 100], fov: 45, near: 0.01, far: 5000 }}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: SRGBColorSpace,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <StarsBackground />
        <Sun3D selected={selectedBodyName === 'Sun'} onSelect={() => onSelectBody('Sun')} />
        <Orbits />
        <OrbitEngineBridge positionsRef={positionsRef}>
          <Bodies selectedBodyName={selectedBodyName} onSelectBody={onSelectBody} />
          <SaturnRings />
        </OrbitEngineBridge>
        <CameraRig tiltRef={tiltRef} />
        {postFxEnabled && <PostProcessing />}
      </Suspense>
    </Canvas>
  );
}