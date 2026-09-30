/**
 * Meccanica orbitale kepleriana semplificata.
 *
 * Le orbite dei pianeti non sono circonferenze perfette ma ellissi con
 * eccentricità reale. Risolviamo l'equazione di Keplero
 *
 *     M = E - e·sin(E)
 *
 * (dove M è l'anomalia media, E l'anomalia eccentrica ed e l'eccentricità)
 * con il metodo di Newton-Raphson per ottenere la posizione esatta del
 * pianeta sull'ellisse in funzione del tempo.
 */

const DEG = Math.PI / 180;

/** Epoca J2000.0 come timestamp Unix in ms (1 gen 2000, 12:00 TT). */
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Giorni giuliani trascorsi dall'epoca J2000.0 per una data. */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / 86_400_000;
}

/** Normalizza un angolo in gradi nel range [0, 360). */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Risolve l'equazione di Keplero M = E - e·sin(E).
 * @param meanAnomalyDeg anomalia media in gradi
 * @param ecc eccentricità dell'orbita (0 ≤ e < 1)
 * @returns anomalia eccentrica in gradi [0, 360)
 */
export function solveKepler(meanAnomalyDeg: number, ecc: number): number {
  if (!(ecc > 0)) return normalizeDeg(meanAnomalyDeg);
  const M = normalizeDeg(meanAnomalyDeg) * DEG;
  let E = M; // buon punto di partenza per eccentricità planetarie (< 0.25)
  for (let i = 0; i < 12; i++) {
    const dE = (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return normalizeDeg(E / DEG);
}

/**
 * Posizione sul cerchio d'orbita della simulazione.
 *
 * Il palco usa un anello circolare di raggio `radius` (px), quindi
 * "proiettiamo" l'ellisse reale mantenendo l'angolo vero (longitudine) e
 * modulando il raggio secondo la legge dell'ellisse polare:
 *
 *     r(θ) = a(1 - e²) / (1 + e·cos θ)
 *
 * @param radiusPx raggio nominale dell'orbita nella simulazione
 * @param ecc eccentricità reale del pianeta
 * @param trueAnomalyDeg anomalia vera in gradi
 * @returns distanza radiale in px dal fuoco (Sole)
 */
export function orbitalRadiusPx(radiusPx: number, ecc: number, trueAnomalyDeg: number): number {
  const theta = trueAnomalyDeg * DEG;
  return (radiusPx * (1 - ecc * ecc)) / (1 + ecc * Math.cos(theta));
}

/** Anomalia vera a partire dall'anomalia eccentrica (in gradi). */
export function trueAnomalyFromEccentric(eccentricDeg: number, ecc: number): number {
  const E = eccentricDeg * DEG;
  const nu =
    2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2));
  return normalizeDeg(nu / DEG);
}

/**
 * Longitudine eliocentrica media del pianeta alla data indicata,
 * dalla longitudine all'epoca J2000 e dal periodo orbitale.
 */
export function meanLongitudeAt(
  meanLongitudeJ2000: number,
  orbitalPeriodDays: number,
  date: Date
): number {
  const d = daysSinceJ2000(date);
  return normalizeDeg(meanLongitudeJ2000 + (360 / orbitalPeriodDays) * d);
}

/**
 * Anomalia media "locale" di un pianeta a una data, a partire dalla sua
 * longitudine media all'epoca J2000. L'anomalia media M = λ - ϖ è la
 * posizione angolare misurata dal perielio dell'orbita; nel modello
 * semplificato il perielio locale coincide con la direzione iniziale del
 * pianeta sul palco, quindi M è esattamente l'offset angolare che il motore
 * kepleriano deve applicare a t = 0 per rappresentare la data scelta.
 */
export function meanAnomalyAtDate(planet: KeplerPlanet, date: Date): number {
  return normalizeDeg(
    meanLongitudeAt(planet.meanLongitudeJ2000, planet.orbitalPeriod, date) -
      planet.meanLongitudeJ2000
  );
}

/** Sottoinsieme dei dati di un pianeta necessario alla cinematica kepleriana. */
export interface KeplerPlanet {
  meanLongitudeJ2000: number;
  orbitalPeriod: number;
}
