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
      <ambientLight intensity={0.25} color="#6688cc" />
      {/* decay=0 → intensità costante su tutte le distanze: senza il
          falloff fisico i pianeti esterni (Nettuno ~75 unità) restavano
          quasi neri (irradianza ~0.005 schiacciata da ACES). */}
      <pointLight position={[0, 0, 0]} intensity={2.2} distance={0} decay={0} color="#fff5d0" />
      <directionalLight position={[50, -20, -50]} intensity={0.1} color="#88aaff" />
    </>
  );
}