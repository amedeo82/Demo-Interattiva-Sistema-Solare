/**
 * Coerenza data → simulazione.
 *
 * Quando l'utente sceglie una data, la scena deve "congelarsi" alla
 * configurazione orbitale di quel giorno e il tempo simulato deve ripartire
 * dal valore che corrisponde a quella data. Le due quantità (offset angolari
 * iniziali e simTime di partenza) devono essere DERIVATE DALLA STESSA
 * ANOMALIA MEDIA, altrimenti pianeti con periodi non commensurabili rispetto
 * all'anno terrestre (es. Giove: 4333 giorni) mostrano una longitudine che
 * non coincide con la data indicata nella sidebar.
 *
 * Il modello kepleriano della simulazione usa come offset iniziale l'anomalia
 * media M misurata dal perielio locale (λ - ϖ), non la longitudine assoluta:
 * `meanAnomalyAtDate` restituisce proprio M, da cui discende sia l'angolo
 * sia il tempo (t = M/360 · periodo animativo).
 */
import type { PlanetData } from '../data/planets';
import { meanAnomalyAtDate } from './kepler';

/** Anomalie medie di tutti i pianeti alla data scelta: offset angolari del motore. */
export function anglesForDate(planets: PlanetData[], date: Date): Record<string, number> {
  return Object.fromEntries(planets.map((p) => [p.name, meanAnomalyAtDate(p, date)]));
}

/**
 * Tempo simulato (secondi a 1x) corrispondente alla data scelta, derivato
 * dall'anomalia media della Terra: M = n·t → t = (M/360)·durata anno.
 * È lo stesso istante da cui partono gli offset di `anglesForDate`, quindi
 * posizione in scena e data in sidebar restano sincronizzate a ogni epoca.
 */
export function simTimeForDate(earth: PlanetData, date: Date): number {
  const m = meanAnomalyAtDate(earth, date);
  return (m / 360) * earth.animationDuration;
}
