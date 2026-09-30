/** Utility numeriche condivise (pure, facilmente testabili). */

/** Formatta un numero con separatore delle migliaia in it-IT. */
export function formatNumber(n: number): string {
  return n.toLocaleString('it-IT');
}

/** Etichetta del periodo orbitale: giorni sotto l'anno, anni oltre. */
export function formatOrbitalPeriod(days: number): string {
  if (days < 365) return `${formatNumber(days)} giorni`;
  const years = (days / 365.25).toFixed(1);
  return `${years} anni (${formatNumber(days)} giorni)`;
}

/** Limita `value` nell'intervallo [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Scala del "palco" del sistema solare in base alla viewport.
 * Pura e testabile: larghezza disponibile meno sidebar (272px su desktop),
 * altezza meno header/footer (~110px), limitata a [0.3, 1].
 */
export function computeSystemScale(
  innerWidth: number,
  innerHeight: number,
  stageSize: number
): number {
  const availW = innerWidth - (innerWidth >= 1024 ? 272 : 32);
  const availH = innerHeight - 110;
  return clamp(Math.min(availW / stageSize, availH / stageSize, 1), 0.3, 1);
}
