/**
 * <CameraRig /> — OrbitControls + tilt della camera 3D.
 * Espone il ref OrbitControls via forwardRef per consentire ad altri
 * componenti (CameraAnimator) di pilotare la camera imperativamente.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export interface CameraRigHandle {
  controls: OrbitControlsImpl | null;
}

export const CameraRig = forwardRef<
  CameraRigHandle,
  {
    tiltRef: MutableRefObject<{ pitch: number; yaw: number }>;
    /** S3.5 — quando true, il tilt lock viene disabilitato (free orbit). */
    freeCamera?: boolean;
  }
>(function CameraRig({ tiltRef, freeCamera = false }, ref) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  // Applica il polar angle SOLO quando il tilt cambia davvero: chiamarlo
  // ogni frame combatteva con il drag verticale e il damping → scatti.
  const lastPitchRef = useRef<number>(Infinity);

  useImperativeHandle(ref, () => ({ controls: controlsRef.current }), []);

  useFrame(() => {
    if (!controlsRef.current || freeCamera) return;
    const t = tiltRef.current;
    const polar = Math.PI / 2 - (t.pitch * Math.PI) / 180;
    if (polar !== lastPitchRef.current) {
      lastPitchRef.current = polar;
      controlsRef.current.setPolarAngle?.(polar);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={freeCamera ? 0.5 : 0.5}
      maxDistance={freeCamera ? 2000 : 500}
      enablePan
      target={[0, 0, 0]}
      // In free camera i limiti di rotazione sono rimossi
      minPolarAngle={freeCamera ? 0 : 0}
      maxPolarAngle={freeCamera ? Math.PI : Math.PI}
    />
  );
});