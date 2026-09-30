/**
 * PRNG condivisi.
 *
 * `mulberry32` era duplicato in textures.ts e AsteroidBelt.tsx: qui vive
 * l'unica copia, così il determinismo della generazione (texture, fascia
 * asteroidi) è garantito da un solo implementazione testata.
 */

/** PRNG mulberry32: veloce, deterministico, ottimo per generazione procedurale. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
