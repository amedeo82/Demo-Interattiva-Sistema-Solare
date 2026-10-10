/**
 * <Lighting /> — illuminazione della scena 3D.
 *
 * Tre fonti luminose:
 *  1. **Ambient** (0.25) — blu notte per il fondo
 *  2. **PointLight al Sole** (2.2, decay=0) — l'illuminazione "vera" dei
 *     pianeti, costante su tutte le distanze
 *  3. **DirectionalLight "rim"** (0.1) — fill controluce azzurrino
 *
 * Quando `eclipsesEnabled` è true, la pointLight al Sole proietta ombre
 * (shadow map): la Luna può quindi eclissare il Sole visto dalla Terra, e
 * la Terra può proiettare ombra sulla Luna. Le ombre sono rese solo sui
 * corpi con `castShadow`/`receiveShadow` (impostato da Bodies/Moons).
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';

export function Lighting({ eclipsesEnabled = false }: { eclipsesEnabled?: boolean } = {}) {
  const { scene, gl } = useThree();
  useEffect(() => {
    scene.background = new Color('#02020a');
    // Shadow map richiede renderer.shadowMap.enabled.
    gl.shadowMap.enabled = eclipsesEnabled;
    if (eclipsesEnabled) {
      gl.shadowMap.type = 2; // THREE.PCFSoftShadowMap
    }
  }, [scene, gl, eclipsesEnabled]);
  return (
    <>
      <ambientLight intensity={0.25} color="#6688cc" />
      <pointLight
        position={[0, 0, 0]}
        intensity={2.2}
        distance={0}
        decay={0}
        color="#fff5d0"
        castShadow={eclipsesEnabled}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={500}
      />
      <directionalLight position={[50, -20, -50]} intensity={0.1} color="#88aaff" />
    </>
  );
}
