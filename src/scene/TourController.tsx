/**
 * <TourController /> — gestisce il tour guidato "Cinematic Tour".
 * Cicla automaticamente tra una serie di inquadrature cinematografiche,
 * ciascuna delle quali triggera un flyTo della camera (vedi CameraAnimator).
 *
 * Sequenza predefinita (3 tappe, ~5s ciascuna):
 *  1. Overview del sistema (camera lontana, leggermentea alta)
 *  2. Close-up Terra
 *  3. Close-up Saturno (angolazione per mostrare gli anelli)
 */
import { useEffect, useRef } from 'react';
import { BODIES_3D, angleToOrbitPosition } from './bodies3d';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { easeInOutCubic } from './easing';
import { useFrame, useThree } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export type TourStep = 'overview' | 'earth' | 'saturn' | 'end';

export interface TourControllerProps {
  /** Se true, il tour gira. */
  active: boolean;
  /** Ref al OrbitControls (per disabilitare durante i fly-to). */
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  /** Ref alle posizioni correnti dei pianeti. */
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>;
  /** Callback per cambiare pianeta selezionato. */
  onSelectBody: (name: string) => void;
  /** Callback quando il tour termina o avanza. */
  onStep?: (step: TourStep) => void;
}

/** Durata di ogni fly-to del tour (ms). */
const TWEEN_MS = 1800;
/** Pausa (in ms) fra un fly-to e il successivo. */
const STEP_PAUSE_MS = 800;

export function TourController({
  active,
  controlsRef,
  positionsRef,
  onSelectBody,
  onStep,
}: TourControllerProps) {
  const { camera } = useThree();
  const stepRef = useRef<TourStep>('overview');
  const tweenRef = useRef<{
    camFrom: Vector3;
    camTo: Vector3;
    tgtFrom: Vector3;
    tgtTo: Vector3;
    startMs: number;
  } | null>(null);
  const nextStepAtRef = useRef(0);

  // Funzione che programma il fly-to verso il prossimo step del tour
  const scheduleFlyTo = (step: TourStep, camPos?: Vector3, lookAt?: Vector3) => {
    if (!controlsRef.current) return;
    if (camPos && lookAt) {
      tweenRef.current = {
        camFrom: camera.position.clone(),
        camTo: camPos,
        tgtFrom: controlsRef.current.target.clone(),
        tgtTo: lookAt,
        startMs: performance.now(),
      };
      controlsRef.current.enabled = false;
    } else if (step === 'earth') {
      const pos = positionsRef.current['Earth'];
      if (pos) {
        const body = BODIES_3D.Earth;
        const planet = angleToOrbitPosition(pos.angle, body.orbitDistance);
        const cam = planet.clone().add(new Vector3(0, 0.5, 1).normalize().multiplyScalar(8));
        tweenRef.current = {
          camFrom: camera.position.clone(),
          camTo: cam,
          tgtFrom: controlsRef.current.target.clone(),
          tgtTo: planet,
          startMs: performance.now(),
        };
        controlsRef.current.enabled = false;
        onSelectBody('Earth');
      }
    } else if (step === 'saturn') {
      const pos = positionsRef.current['Saturn'];
      if (pos) {
        const body = BODIES_3D.Saturn;
        const planet = angleToOrbitPosition(pos.angle, body.orbitDistance);
        // Angolazione cinematografica: leggermente sopra, per mostrare gli anelli
        const cam = planet.clone().add(new Vector3(0.3, 0.6, 0.8).normalize().multiplyScalar(15));
        tweenRef.current = {
          camFrom: camera.position.clone(),
          camTo: cam,
          tgtFrom: controlsRef.current.target.clone(),
          tgtTo: planet,
          startMs: performance.now(),
        };
        controlsRef.current.enabled = false;
        onSelectBody('Saturn');
      }
    } else if (step === 'overview') {
      const cam = new Vector3(0, 70, 100);
      tweenRef.current = {
        camFrom: camera.position.clone(),
        camTo: cam,
        tgtFrom: controlsRef.current.target.clone(),
        tgtTo: new Vector3(0, 0, 0),
        startMs: performance.now(),
      };
      controlsRef.current.enabled = false;
    }
    nextStepAtRef.current = performance.now() + TWEEN_MS + STEP_PAUSE_MS;
    onStep?.(step);
  };

  // Quando `active` diventa true, parte il tour
  useEffect(() => {
    if (!active) {
      stepRef.current = 'end';
      tweenRef.current = null;
      nextStepAtRef.current = 0;
      return;
    }
    stepRef.current = 'overview';
    scheduleFlyTo('overview');
  }, [active]);

  // Avanza automaticamente fra i step
  useFrame(() => {
    const tw = tweenRef.current;
    if (tw) {
      const elapsed = performance.now() - tw.startMs;
      const t = Math.min(elapsed / TWEEN_MS, 1);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(tw.camFrom, tw.camTo, eased);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.lerpVectors(tw.tgtFrom, tw.tgtTo, eased);
        controls.update();
      }
      if (t >= 1) {
        tweenRef.current = null;
        if (controls) controls.enabled = true;
      }
      return;
    }
    if (!active) return;
    if (performance.now() >= nextStepAtRef.current && nextStepAtRef.current > 0) {
      // Avanza al prossimo step
      if (stepRef.current === 'overview') {
        stepRef.current = 'earth';
        scheduleFlyTo('earth');
      } else if (stepRef.current === 'earth') {
        stepRef.current = 'saturn';
        scheduleFlyTo('saturn');
      } else if (stepRef.current === 'saturn') {
        stepRef.current = 'end';
        nextStepAtRef.current = 0;
        onStep?.('end');
      }
    }
  });

  return null;
}