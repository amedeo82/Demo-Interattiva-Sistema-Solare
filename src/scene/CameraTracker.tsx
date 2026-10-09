/**
 * <CameraTracker /> — aggiorna via ref posizione e distanza camera ad ogni
 * frame. Da montare come figlio dentro <Canvas>. Zero re-render React.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MutableRefObject } from 'react';

export interface CameraTrackerRefs {
  cameraDistanceRef: MutableRefObject<number>;
  cameraPositionRef: MutableRefObject<{ x: number; y: number; z: number }>;
  fpsRef: MutableRefObject<number>;
}

export function CameraTracker({ cameraDistanceRef, cameraPositionRef, fpsRef }: CameraTrackerRefs) {
  const { camera } = useThree();
  const lastTimeRef = useRef(performance.now());
  const fpsAccumRef = useRef({ frames: 0, last: performance.now() });

  useFrame(() => {
    const now = performance.now();
    const d = camera.position.length();
    cameraDistanceRef.current = d;
    cameraPositionRef.current.x = camera.position.x;
    cameraPositionRef.current.y = camera.position.y;
    cameraPositionRef.current.z = camera.position.z;
    lastTimeRef.current = now;

    // FPS: media mobile a 1 secondo
    const acc = fpsAccumRef.current;
    acc.frames += 1;
    if (now - acc.last >= 1000) {
      fpsRef.current = (acc.frames * 1000) / (now - acc.last);
      acc.frames = 0;
      acc.last = now;
    }
  });

  return null;
}
