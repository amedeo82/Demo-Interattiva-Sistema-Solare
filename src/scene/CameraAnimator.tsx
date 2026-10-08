/**
 * <CameraAnimator> — gestisce TUTTE le transizioni della camera 3D.
 *
 * Due modalità:
 *  1. **Intro flythrough** (al mount): la camera parte da lontano (alto,
 *     inclinata) e "scende" sulla scena in 3 secondi. Effetto "title shot"
 *     tipico dei film di fantascienza.
 *  2. **Fly-to on select** (quando cambia `selectedBodyName`): la camera
 *     vola verso il pianeta selezionato, fermandosi a una distanza che
 *     mostra il pianeta intero ma lo rende protagonista dell'inquadratura.
 *
 * Implementazione: tween imperativo dentro `useFrame` con easing cubico
 * (vedi easing.ts). Durante la tween OrbitControls è disabilitato per
 * evitare che il drag dell'utente interferisca.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { BODIES_3D, angleToOrbitPosition } from './bodies3d';
import { easeInOutCubic } from './easing';
import type { MutableRefObject } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

export interface CameraAnimatorProps {
  /** Ref al OrbitControls (per disabilitare/aggiornare target). */
  controlsRef: MutableRefObject<{ controls: OrbitControlsImpl | null }>;
  /** Posizioni correnti dei pianeti (dal motore orbitale). */
  positionsRef: MutableRefObject<Record<string, SimPlanetState>>;
  /** Pianeta selezionato (cambio = trigger fly-to). */
  selectedBodyName: string | null;
  /** Ref per propagare la fine dell'intro al chiamante (per il titolo). */
  onIntroComplete?: () => void;
}

/** Stato di una singola tween attiva. */
interface Tween {
  kind: 'intro' | 'flyto';
  /** Posizione camera: da → a. */
  camFrom: Vector3;
  camTo: Vector3;
  /** Punto guardato (orbit target): da → a. */
  tgtFrom: Vector3;
  tgtTo: Vector3;
  startMs: number;
  durationMs: number;
}

export function CameraAnimator({
  controlsRef,
  positionsRef,
  selectedBodyName,
  onIntroComplete,
}: CameraAnimatorProps) {
  const { camera } = useThree();
  const tweenRef = useRef<Tween | null>(null);
  const introDoneRef = useRef(false);

// ── Intro flythrough (al mount) ──
// La camera parte da lontano (alto, lontano dal sistema, pitch forte)
// e scivola verso la posizione di default. Effetto "reveal".
//
// `camera` e `controlsRef` sono STABILI (camera viene da useThree; controlsRef
// è un useRef nel parent). Aggiungerli ai deps NON causa re-trigger dell'intro.
useEffect(() => {
    // Posizione iniziale drammatica: alto, lontano, leggermentea a destra
    const introStart = new Vector3(0, 100, 220);
    const introEnd = new Vector3(0, 70, 100); // matches Canvas camera prop
    camera.position.copy(introStart);
    camera.lookAt(0, 0, 0);

    tweenRef.current = {
      kind: 'intro',
      camFrom: introStart,
      camTo: introEnd,
      tgtFrom: new Vector3(0, 0, 0),
      tgtTo: new Vector3(0, 0, 0),
      startMs: performance.now(),
      durationMs: 3000,
    };
    // NB: controls non va toccato qui — all'intro il holder del parent è
    // ancora null (il suo useEffect gira DOPO i figli) e `enabled=false`
    // era un no-op, lasciando il damping a combattere con la tween.
    // La disabilitazione avviene dentro useFrame (vedi sotto).
  }, [camera, controlsRef]);

  // ── Fly-to on planet select ──
  // Calcola la posizione target a una distanza fissa dal pianeta, in
  // una direzione leggermente sopra-davanti (angolo cinematografico).
  useEffect(() => {
    if (!selectedBodyName) return;
    const body = BODIES_3D[selectedBodyName];
    if (!body) return;
    const pos = positionsRef.current[selectedBodyName];
    if (!pos) return;

    const planetWorld = angleToOrbitPosition(pos.angle, body.orbitDistance);

    // Distanza di inquadratura proporzionata al raggio (minimo basso: con la
    // nuova scala anche Mercurio va riempito bene, prima restava un puntino).
    const view = Math.max(body.radius * 9, 1.5);

    // Direzione "angolo cinematografico": 25° sopra il piano dell'orbita,
    // leggermentea a destra del fronte.
    const angleDeg = 25; // pitch
    const dir = new Vector3(
      Math.sin(pos.angle * Math.PI / 180) * 0.7,
      Math.sin(angleDeg * Math.PI / 180),
      Math.cos(pos.angle * Math.PI / 180) * 0.7 + 1
    ).normalize();

    const camTarget = planetWorld.clone().add(dir.multiplyScalar(view));
    const tgtTarget = planetWorld.clone();

    if (!controlsRef.current?.controls) return;
    tweenRef.current = {
      kind: 'flyto',
      camFrom: camera.position.clone(),
      camTo: camTarget,
      tgtFrom: controlsRef.current.controls.target.clone(),
      tgtTo: tgtTarget,
      startMs: performance.now(),
      durationMs: 1200,
    };
  }, [selectedBodyName, positionsRef, camera, controlsRef]);

  // ── Esegui la tween imperativamente in useFrame ──
  useFrame(() => {
    const tw = tweenRef.current;
    if (!tw) return;
    const controls = controlsRef.current?.controls;
    // Disabilita i controls SOLO mentre la tween è attiva (funziona anche
    // per l'intro, quando controls esiste già ma l'effect non poteva vederlo).
    if (controls) controls.enabled = false;
    const elapsed = performance.now() - tw.startMs;
    const t = Math.min(elapsed / tw.durationMs, 1);
    const eased = easeInOutCubic(t);

    camera.position.lerpVectors(tw.camFrom, tw.camTo, eased);
    if (controls) {
      controls.target.lerpVectors(tw.tgtFrom, tw.tgtTo, eased);
      controls.update();
    }

    if (t >= 1) {
      tweenRef.current = null;
      if (controls) controls.enabled = true;
      if (tw.kind === 'intro' && !introDoneRef.current) {
        introDoneRef.current = true;
        onIntroComplete?.();
      }
    }
  });

  return null;
}