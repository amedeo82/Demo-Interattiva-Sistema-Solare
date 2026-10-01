/**
 * Funzioni di easing per animazioni cinematografiche della camera.
 * Standard cubic-bezier shapes: la maggior parte delle transizioni 3D usa
 * `easeInOutCubic` (smooth entrata/uscita) per dare "peso" al movimento.
 */

/** Cubic ease-in-out: 0→1 con accelerazione al centro e decelerazione finale.
 *  È la curva più naturale per fly-to (non sembra meccanica). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Cubic ease-out: decelerazione finale. Per i "reveal" (titolo che scompare). */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Quad ease-in: per i "build" (titolo che appare da zero). */
export function easeInQuad(t: number): number {
  return t * t;
}

/** Clamp in [0, 1] per evitare extrapolazione. */
export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}