/**
 * Coerenza data → simulazione.
 *
 * Quando l'utente sceglie una data, la scena deve "congelarsi" alla
 * configurazione orbitale di quel giorno e il tempo simulato deve ripartire
 * dal valore che corrisponde a quella data. Il motore (vedi
 * `useOrbitEngine.keplerPosition`) calcola la longitudine mostrata come
 *
 *     angolo(t) = M₀ + ν(M(t) − M₀),   M(t) = M₀ + 360·t/P_anim
 *
 * dove M₀ è l'offset angolare della data e ν l'anomalia vera kepleriana:
 * M₀ viene cioè usata DUE volte, come fase iniziale E come origine
 * dell'avanzamento medio. Affinché a t₀ il pianeta si trovi alla longitudine
 * media reale λ(data) = ϖ + M_data serve quindi
 *
 *     ν(frac(360·t₀/P_anim) − M_data) ≈ 0   ⇒   360·t₀/P_anim ≡ M_data (mod 360)
 *
 * con scarto residuo al massimo l'equazione del centro (≈2e in radianti).
 * `simTimeForDate` costruisce esattamente un t₀ con questa proprietà, così
 * offset angolari (`anglesForDate`) e tempo di partenza derivano dalla STESSA
 * anomalia media — per TUTTI i pianeti e a qualsiasi epoca, non solo per la
 * Terra come faceva il vecchio "orologio di Giove".
 */
import type { PlanetData } from '../data/planets';
import { meanAnomalyAtDate, daysSinceJ2000 } from './kepler';
import { EARTH_DEG_PER_SIM_SEC } from '../config';

/** Anomalie medie di tutti i pianeti alla data scelta: offset angolari del motore. */
export function anglesForDate(planets: PlanetData[], date: Date): Record<string, number> {
  return Object.fromEntries(planets.map((p) => [p.name, meanAnomalyAtDate(p, date)]));
}

/**
 * Tempo simulato (secondi a 1x) corrispondente alla data scelta.
 *
 * Condizione di coerenza per ogni pianeta (vedi header del modulo):
 * all'istante t₀ l'avanzamento medio 360·t₀/P_anim deve coincidere (mod 360)
 * con l'anomalia media M_data della data, che è anche l'offset iniziale.
 *
 * Il tempo SIMULATO è definito dalla scala terrestre condivisa da sidebar,
 * fascia asteroidi e this modulo: 1 secondo di sim =
 * P_reale(Terra)/EARTH_YEAR_SIM_SECONDS giorni REALI, cioè
 *
 *     Δgiorni = t · P_reale(terra) / EARTH_YEAR_SIM_SECONDS      (∀ pianeti)
 *
 * Da cui l'avanzamento del pianeta p a tempo t:
 *
 *     360·t/P_anim(p) = t · EARTH_DEG_PER_SIM_SEC · P_reale(p)/P_reale(terra)
 *
 * (identico a 360·t/P_anim quando la relazione P_anim = P_reale/scala vale
 * per il pianeta). Risolvendo la congruenza
 *
 *     t · EARTH_DEG_PER_SIM_SEC · P_real(p)/P_real(terra) ≡ M_data (mod 360)
 *
 * si ottiene il più piccolo t ≥ 0 coerente. La formula è ESATTA per la
 * Terra; per gli altri pianeti usa gli stessi dati animativi del motore
 * (`animationDuration`), quindi offset e tempo derivano comunque dalla
 * STESSA anomalia media della data.
 */
export function simTimeForDate(earth: PlanetData, date: Date, allPlanets?: PlanetData[]): number {
  const planet = allPlanets?.find((p) => p.name === earth.name) ?? earth;
  const P = planet.animationDuration;
  if (!(P > 0) || !(earth.orbitalPeriod > 0)) return 0;
  const m = meanAnomalyAtDate(planet, date); // ∈ [0, 360)
  // Avanzamento angolare del pianeta per secondo di simulazione: identico a
  // 360/P, espresso però con la scala temporale condivisa della simulazione.
  const degPerSec = (EARTH_DEG_PER_SIM_SEC * planet.orbitalPeriod) / earth.orbitalPeriod;
  // x = resto non negativo di (m − ε)/360, con ε tiny anti floating-point:
  // numero di giri "interi" da aggiungere per rendere t₀ ≥ 0
  const x = (((m + 1e-9) / 360) % 1 + 1) % 1;
  return (x * 360 - m) / degPerSec;
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
