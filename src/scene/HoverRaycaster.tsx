/**
 * <HoverRaycaster /> — raycast mouse sul piano orbitale e sui pianeti stessi.
 * Da montare DENTRO il <Canvas>. Aggiorna via ref:
 *  - mouseNdcRef.current: posizione NDC del mouse
 *  - worldHitRef.current: punto 3D sul piano Y=0 (se il mouse è sopra)
 *  - hoveredBodyRef.current: nome del corpo più vicino sotto il mouse
 *
 * Usa Three.js Raycaster + un piano invisibile a Y=0 (piano dell'eclittica).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Vector2, Raycaster, Vector3 } from 'three';
import type { MutableRefObject } from 'react';
import { BODIES_3D, BODIES_ORDER, angleToOrbitPosition } from './bodies3d';

export interface HoverRaycasterProps {
  mouseNdcRef: MutableRefObject<{ x: number; y: number }>;
  worldHitRef: MutableRefObject<{ x: number; y: number; z: number } | null>;
  hoveredBodyRef: MutableRefObject<string | null>;
  positionsRef: MutableRefObject<Record<string, { angle: number; radius: number }>>;
}

export function HoverRaycaster({
  mouseNdcRef,
  worldHitRef,
  hoveredBodyRef,
  positionsRef,
}: HoverRaycasterProps) {
  const { camera, gl } = useThree();
  const raycasterRef = useRef(new Raycaster());
  const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0)); // Y=0
  const intersectRef = useRef(new Vector3());
  const pointerRef = useRef(new Vector2());

  // BUG FIX: l'addEventListener ERA nel render body e si accumulava ad ogni
  // re-render (memory leak + comportamento indefinito). Va in useEffect
  // con cleanup per garantire UN solo listener per la vita del componente.
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      mouseNdcRef.current.x = (cx / rect.width) * 2 - 1;
      mouseNdcRef.current.y = -((cy / rect.height) * 2 - 1);
    };
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
    };
  }, [gl, mouseNdcRef]);

  useFrame(() => {
    const ndc = mouseNdcRef.current;
    // Reset hit se mouse fuori dal canvas
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) {
      worldHitRef.current = null;
      hoveredBodyRef.current = null;
      return;
    }

    pointerRef.current.set(ndc.x, ndc.y);
    raycasterRef.current.setFromCamera(pointerRef.current, camera);

    // 1) Raycast sul piano dell'eclittica Y=0
    const planeHit = raycasterRef.current.ray.intersectPlane(
      planeRef.current,
      intersectRef.current
    );
    if (planeHit) {
      worldHitRef.current = { x: planeHit.x, y: planeHit.y, z: planeHit.z };
    }

    // 2) Raycast sui pianeti — trova il più vicino all'interno di 1.2x del suo diametro
    const positions = positionsRef.current;
    let bestBody: string | null = null;
    let bestDist = Infinity;
    const tmp = new Vector3();
    for (const bodyName of BODIES_ORDER) {
      const body = BODIES_3D[bodyName];
      const pos = positions[bodyName];
      if (!pos) continue;
      const center = angleToOrbitPosition(pos.angle, body.orbitDistance);
      tmp.copy(center);
      // Distanza dal raggio al centro del pianeta
      const dist = raycasterRef.current.ray.distanceSqToPoint(tmp);
      const threshold = Math.pow(body.radius * 1.3, 2);
      if (dist < threshold && dist < bestDist) {
        bestDist = dist;
        bestBody = bodyName;
      }
    }
    hoveredBodyRef.current = bestBody;
  });

  return null;
}