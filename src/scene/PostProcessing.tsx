/** Bloom (alone del Sole) + Vignette cinematografica.
 *
 *  NB: multisampling DEVE restare 0. Con MSAA > 0 sui render target del
 *  composer il canvas presenta frame neri a intermittenza (sfarfallio:
 *  l'intro e le orbite risultano invisibili, FPS crollano). Verificato
 *  misurando il drawing buffer: 55/60 frame neri con multisampling={4},
 *  0/60 con {0}. Non ri-alzarlo senza un test cross-GPU. */
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';

export function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.3}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
