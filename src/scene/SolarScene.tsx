/**
 * <SolarScene /> — wrapper del <Canvas> react-three-fiber.
 * Sostituisce il vecchio rendering DOM-only.
 */
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Suspense, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Bodies } from './Bodies';
import { Orbits } from './Orbits';
import { Lighting } from './Lighting';
import { Sun3D } from './Sun3D';
import { StarsBackground } from './StarsBackground';
import { CameraRig, type CameraRigHandle } from './CameraRig';
import { CameraAnimator } from './CameraAnimator';
import { PostProcessing } from './PostProcessing';
import { OrbitEngineBridge } from './OrbitEngineBridge';
import { SaturnRings } from './SaturnRings';
import { TourController, type TourStep } from './TourController';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface SolarSceneProps {
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>;
  selectedBodyName: string | null;
  onSelectBody: (name: string) => void;
  postFxEnabled: boolean;
  tiltRef: MutableRefObject<{ pitch: number; yaw: number }>;
  /** Callback quando l'intro flythrough termina (per il titolo CSS). */
  onIntroComplete?: () => void;
  /** S3.5 — modalità camera libera. */
  freeCamera?: boolean;
  /** S3.6 — tour guidato attivo. */
  tourActive?: boolean;
  /** S3.6 — step corrente del tour (per aggiornare l'overlay DOM). */
  onTourStep?: (step: TourStep) => void;
}

export function SolarScene({
  positionsRef,
  selectedBodyName,
  onSelectBody,
  postFxEnabled,
  tiltRef,
  onIntroComplete,
  freeCamera = false,
  tourActive = false,
  onTourStep,
}: SolarSceneProps) {
  // Ref al OrbitControls per consentire a CameraAnimator di pilotare la camera.
  const rigRef = useRef<CameraRigHandle>(null);

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
        <CameraRig ref={rigRef} tiltRef={tiltRef} freeCamera={freeCamera} />
        {/* S3.6 — Tour guidato (cicla flyTo fra panoramica, Terra, Saturno) */}
        <TourController
          active={tourActive}
          controlsRef={
            { get current() { return rigRef.current?.controls ?? null; } } as MutableRefObject<import('three-stdlib').OrbitControls>
          }
          positionsRef={positionsRef}
          onSelectBody={onSelectBody}
          onStep={onTourStep}
        />
        {/* Animatore camera: intro flythrough + fly-to on select.
            DEVE stare DOPO CameraRig nell'albero React così che rigRef.current
            sia già popolato al primo render. */}
        <CameraAnimator
          controlsRef={
            { get current() { return rigRef.current?.controls ?? null; } } as MutableRefObject<import('three-stdlib').OrbitControls>
          }
          positionsRef={positionsRef}
          selectedBodyName={selectedBodyName}
          onIntroComplete={onIntroComplete}
        />
        {postFxEnabled && <PostProcessing />}
      </Suspense>
    </Canvas>
  );
}