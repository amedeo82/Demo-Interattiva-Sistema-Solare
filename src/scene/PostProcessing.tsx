/** Bloom (alone del Sole) + Lens flare + Vignette cinematografica.
 *
 *  NB: multisampling DEVE restare 0. Con MSAA > 0 sui render target del
 *  composer il canvas presenta frame neri a intermittenza (sfarfallio:
 *  l'intro e le orbite risultano invisibili, FPS crollano). Verificato
 *  misurando il drawing buffer: 55/60 frame neri con multisampling={4},
 *  0/60 con {0}. Non ri-alzarlo senza un test cross-GPU.
 *
 *  S15 · R1 — Lens flare via postprocessing (sostituisce il prototipo DOM
 *  scartato in 4.6). Attivo solo quando il composer è montato (FX toggle:
 *  default desktop ON, mobile OFF). Occlusione gestita dal wrapper
 *  (raycast verso la posizione proiettata del Sole: i pianeti che passano
 *  davanti attenuano il flare, i mesh con `userData.lensflare` non lo
 *  oscurano mai). Il raycast per frame è il costo principale del wrapper:
 *  accettabile perché gated da FX, con `starBurst` disattivato. */
import { EffectComposer, Bloom, Vignette, LensFlare } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';

/** Sole all'origine della scena (0, 0, 0). */
const SUN_POSITION = [0, 0, 0] as const;

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
      {/* R1 — flare sobrio: opacity 0.45 (non "blow out" col Bloom), glare
          ampio ma starBurst OFF (costo/qualità), ghost secondari on per il
          realismo ottico. lensPosition segue il Sole all'origine. */}
      <LensFlare
        lensPosition={SUN_POSITION}
        opacity={0.45}
        glareSize={0.3}
        starBurst={false}
        secondaryGhosts
        aditionalStreaks
        animated
      />
      <Vignette eskil={false} offset={0.1} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
