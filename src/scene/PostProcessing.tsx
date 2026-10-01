/** Bloom (alone del Sole) + Vignette cinematografica. */
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';

export function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.9}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}