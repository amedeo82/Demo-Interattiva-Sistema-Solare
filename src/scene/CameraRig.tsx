/**
 * <CameraRig /> — OrbitControls + tilt della camera 3D.
 */
import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export function CameraRig({ tiltRef }: { tiltRef: MutableRefObject<{ pitch: number; yaw: number }> }) {
  const ref = useRef<OrbitControlsImpl>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = tiltRef.current;
    const polar = Math.PI / 2 - (t.pitch * Math.PI) / 180;
    ref.current.setPolarAngle?.(polar);
  });
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={500}
      enablePan
      target={[0, 0, 0]}
    />
  );
}