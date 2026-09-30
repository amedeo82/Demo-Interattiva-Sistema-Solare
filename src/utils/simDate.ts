/**
 * Coerenza data → simulazione.
 *
 * Quando l'utente sceglie una data, la scena deve "congelarsi" alla
 * configurazione orbitale di quel giorno e il tempo simulato deve ripartire
 * dal valore che corrisponde a quella data. Il motore (vedi
 * `useOrbitEngine.keplerPosition`) calcola la longitudine mostrata come
 *
 *     angolo(t) = start + ν(M_data + 360·(t − t₀)/P_anim − M₀)
 *
 * dove `start` è l'offset angolare della data, M_data l'anomalia media reale
 * della data e t₀ il tempo di partenza. Imponendo
 *
 *     start = λ_data (= ϖ + M_data)   e   M₀ := M_data,   t₀ tale che
 *     360·(t − t₀)/P_anim ≡ 0 (mod 360) per OGNI pianeta
 *
 * a t₀ l'equazione del centro si annulla (ν(0) = 0) e le longitudini in scena
 * coincidono ESATTAMENTE con quelle reali della data — per tutti i pianeti e
 * a qualsiasi epoca. L'avanzamento resta periodico: dopo Δt il medio muove di
 * 360·Δt/P_anim gradi, che per la scala terrestre condivisa (P_anim secondi =
 * P_reali giorni) equivime esattamente all'avanzamento di longitudine media
 * implicito in `meanLongitudeAt`. La condizione su t₀ è garantita dal PPCM
 * dei periodi animativi (`simTimeForDate`).
 */
import type { PlanetData } from '../data/planets';
import { meanLongitudeAt, meanAnomalyAtDate } from './kepler';

/**
 * Offset angolare di un pianeta: longitudine media reale della data
 * λ_data = ϖ + M_data (ϖ = longitudine J2000, nel modello a "perielio
 * locale" è anche la direzione del perielio sul palco). Usare la sola
 * anomalia media M = λ − ϖ avrebbe sfasato i pianeti dello spostamento
 * fisso del perielio (≈100° per la Terra!).
 */
export function anglesForDate(planets: PlanetData[], date: Date): Record<string, number> {
  return Object.fromEntries(
    planets.map((p) => [p.name, meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date)])
  );
}

/** Anomalia media della data: origine dell'avanzamento kepleriano nel motore. */
export function anomaliesForDate(planets: PlanetData[], date: Date): Record<string, number> {
  return Object.fromEntries(planets.map((p) => [p.name, meanAnomalyAtDate(p, date)]));
}

/**
 * Tempo simulato (secondi a 1x) corrispondente alla data scelta.
 *
 * Condizione di coerenza per ogni pianeta (vedi header del modulo): a t₀
 * l'avanzamento medio 360·t₀/P_anim(p) deve essere un multiplo intero di
 * 360° per OGNI pianeta, così che ν(...) = 0 e la longitudine mostrata resti
 * esattamente λ_data (l'offset iniziale di `anglesForDate`).
 *
 * Il motore fa avanzare ogni pianeta di 360/P_anim(p) gradi al secondo, dove
 * P_anim(p) = animationDuration (dati in `planets.ts`). Il più piccolo
 * t ≥ 0 con la proprietà per tutti i pianeti è il PPCM (minimo comune
 * multiplo) dei periodi animativi: i P_anim sono interi, quindi il PPCM è
 * calcolabile ESATTAMENTE con aritmetica intera MCD/PPCM.
 *
 * Nota: la vecchia formula "continua" risolveva la congruenza solo per il
 * pianeta di riferimento (la Terra) e sfasava gli altri anche di ~178°;
 * inoltre usava una scala (EARTH_DEG_PER_SIM_SEC · P_reale/P_reale) che non
 * corrisponde all'angularSpeed reale del motore (360/P_anim).
 */
/** MCD euclideo fra interi non negativi (0 gestito: mcd(0,n)=n). */
function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * PPCM ESATTO (in virgola mobile, valori ben sotto 2^53) di una lista di
 * numeri ≥ 0. Le durate animative del dataset sono multiple di 0.2 s:
 * moltiplicate per 5 diventano interi, il PPCM intero L si calcola con
 * aritmetica esatta MCD/PPCM e il risultato è t₀ = L/5 — niente arrotondamenti
 * (con i decimali binari tipo 2.4, un lcm "continuo" accumulava errori che
 * facevano fallire la condizione di giri interi).
 */
function lcmExact(durations: number[]): number {
  const ints = durations.map((d) => Math.round(Math.abs(d) * 5));
  if (ints.some((v) => !(v > 0))) return 0;
  let l = 1;
  for (const v of ints) l = (l / gcd(l, v)) * v;
  return l / 5;
}

/**
 * Moltiplicatore angolare del pianeta nel motore (`keplerPosition`):
 * gradi di avanzamento medio per secondo di simulazione. È la quantità che
 * deve coincidere con la velocità media reale della data (360°/P_reali al
 * giorno), altrimenti scena e calendario divergono.
 */
export function angularRateDegPerSimSecond(planet: PlanetData): number {
  return 360 / planet.animationDuration;
}

/**
 * Coerenza scala temporale: verifica che il taro "gradi animativi per
 * secondo di sim" di ogni pianeta sia proporzionale alla sua velocità media
 * reale (360/P_reali), con lo STESSO fattore giorni-per-secondo per tutti i
 * pianeti (il taro terrestre `CONFIG.earthYearSimSeconds`). Restituisce il
 * massimo scarto relativo: 0 se la scala è perfettamente coerente.
 */
export function maxScaleMismatch(planets: PlanetData[], earth: PlanetData): number {
  const earthDaysPerSec = earth.orbitalPeriod / earth.animationDuration;
  let worst = 0;
  for (const p of planets) {
    // giorni reali che il pianeta "dovrebbe" percorrere per secondo di sim
    // perché la longitudine media in scena avanzi come quella reale:
    const daysPerSec = angularRateDegPerSimSecond(p) / (360 / p.orbitalPeriod);
    worst = Math.max(worst, Math.abs(daysPerSec / earthDaysPerSec - 1));
  }
  return worst;
}

export function simTimeForDate(earth: PlanetData, date: Date, allPlanets?: PlanetData[]): number {
  // La data NON influenza il risultato: t₀ deve solo garantire giri interi
  // per ogni pianeta (vedi header). Con la lista completa: PPCM dei periodi
  // animativi → sincrono per TUTTI, a qualsiasi epoca.
  if (allPlanets && allPlanets.length > 0) {
    return lcmExact(allPlanets.map((p) => p.animationDuration));
  }
  // Fallback senza lista: il più piccolo t > 0 coerente per il solo pianeta
  // di riferimento è un suo giro completo: t₀ = P_anim(Terra).
  const P = earth.animationDuration;
  if (!(P > 0) || !(earth.orbitalPeriod > 0)) return 0;
  void date;
  return P;
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
