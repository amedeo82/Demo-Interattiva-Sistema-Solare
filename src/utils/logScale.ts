/**
 * S14 · F11 — Normalizzazione logaritmica per le barre del Confronto.
 *
 * `logScale(v, min, max)` mappa v ∈ [min, max] su [0, 1] con scala
 * log10(1+v), utile quando i valori coprono ordini di grandezza
 * (diametri 4 879–142 984 km, distanze 57.9–4 495 mln km).
 */
export function logScale(v: number, min: number, max: number): number {
  if (Number.isNaN(v) || Number.isNaN(min) || Number.isNaN(max)) return 0;
  if (max <= min) return v >= max ? 1 : 0;
  const lv = Math.log10(1 + Math.max(0, v));
  const lmin = Math.log10(1 + Math.max(0, min));
  const lmax = Math.log10(1 + Math.max(0, max));
  if (lmax <= lmin) return 1;
  return Math.min(1, Math.max(0, (lv - lmin) / (lmax - lmin)));
}

/** Velocità orbitale media approssimata in km/s: v = 29.78 / √a_AU. */
export function meanOrbitalVelocity(distanceMlnKm: number): number {
  const au = distanceMlnKm / 149.6;
  if (au <= 0) return 0;
  return 29.78 / Math.sqrt(au);
}
