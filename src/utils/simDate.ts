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

/** Anomalia media di Giove alla data: "orologio" secolare del sistema solare.
 *  Giove (P = 4333 gg) è il pianeta lento con dati orbitali affidabili: la sua
 *  M individua univocamente l'anno, a differenza dell'angolo terrestre, che
 *  ripete sé stesso ogni anno. Serve come fase iniziale del tempo simulato. */
function jupiterPhaseDeg(planets: PlanetData[], date: Date): number {
  const jup = planets.find((p) => p.name === 'Jupiter');
  return jup ? meanAnomalyAtDate(jup, date) : 0;
}

/**
 * Tempo simulato (secondi a 1x) corrispondente alla data scelta.
 *
 * Il motore fa compiere alla Terra un giro completo ogni
 * `animationDuration` secondi: il solo angolo terrestre non identifica
 * l'istante (ogni anno corrisponde allo stesso angolo). Usiamo quindi la
 * fase di Giove come "contatore di anni":
 *
 *     t₀ = (M_giove(data)/360 · P_anim·terra) + (M_terra(data)/360 · P_anim)
 *
 * Al tempo t₀ l'anomalia media del motore per la Terra vale
 * M₀_terra + 360·t₀/P_anim ≡ M₀_terra (mod 360): la scena mostra la
 * configurazione esatta della data, e il termine gioviano rende t₀ diverso
 * per anni diversi — così anche il calendario derivato da simTime
 * (`currentDateForSimTime`) resta sincronizzato a ogni epoca.
 *
 * Limiti noti (modello semplificato): la risoluzione temporale è legata al
 * moto di Giove (~1 giro animativo = 4333 giorni ≈ 12 anni); entro questo
 * arco le posizioni sono quelle reali della data (± equazione di Keplero).
 */
export function simTimeForDate(earth: PlanetData, date: Date, allPlanets?: PlanetData[]): number {
  const mEarth = meanAnomalyAtDate(earth, date);
  const jPhase = allPlanets ? jupiterPhaseDeg(allPlanets, date) : 0;
  return ((jPhase + mEarth) / 360) * earth.animationDuration;
}

/**
 * Data "reale" corrente della simulazione, dato il tempo simulato trascorso
 * dall'epoca iniziale. Si parte dalla configurazione orbitale della data
 * scelta (offset di `anglesForDate`) e si avanza calendarmente con il tempo
 * simulato: 1 anno animativo terrestre = 1 periodo orbitale reale.
 *
 * Coerenza garantita: l'angolo medio della Terra dopo Δt è
 * 360·Δt/P_anim ≡ 360·Δgiorni/P_reale, cioè esattamente l'avanzamento di
 * longitudine media implicito in `meanLongitudeAt` — scena e calendario
 * restano sincronizzati a ogni epoca, anche lontana da J2000.
 */
export function currentDateForSimTime(earth: PlanetData, epoch: Date, simSeconds: number): Date {
  // 1 anno animativo (animationDuration secondi) = 1 periodo orbitale reale
  const days = (simSeconds / earth.animationDuration) * earth.orbitalPeriod;
  return new Date(epoch.getTime() + days * 86_400_000);
}
