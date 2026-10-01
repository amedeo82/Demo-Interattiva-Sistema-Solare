/**
 * <Lighting /> — illuminazione della scena 3D.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';

export function Lighting() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new Color('#02020a');
  }, [scene]);
  return (
    <>
      <ambientLight intensity={0.06} color="#6688cc" />
      <pointLight position={[0, 0, 0]} intensity={3.5} distance={0} decay={1.5} color="#fff5d0" />
      <directionalLight position={[50, -20, -50]} intensity={0.1} color="#88aaff" />
    </>
  );
}