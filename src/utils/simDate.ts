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
 * `meanAnomalyAtDate` restituisce proprio M, da cui discende l'angolo;
 * il tempo di partenza deriva invece dal PPCM dei periodi animativi (vedi
 * `simTimeForDate`).
 */
import type { PlanetData } from '../data/planets';
import { meanAnomalyAtDate } from './kepler';

/** Anomalie medie di tutti i pianeti alla data scelta: offset angolari del motore. */
export function anglesForDate(planets: PlanetData[], date: Date): Record<string, number> {
  return Object.fromEntries(planets.map((p) => [p.name, meanAnomalyAtDate(p, date)]));
}

/**
 * Tempo simulato (secondi a 1x) corrispondente alla data scelta.
 *
 * Il motore fa avanzare TUTTI i pianeti con un unico tempo t: l'avanzamento
 * angolare di ciascuno vale 360·t/P_anim(p). Affinché la scena mostri la
 * configurazione reale della data, t₀ deve soddisfare
 *
 *     M_p(t₀) = M_p(data) + 360·t₀/P_anim(p) ≡ M_p(data)  (mod 360)  ∀ p
 *
 * cioè 360·t₀/P_anim(p) deve essere multiplo intero di 360 per OGNI pianeta:
 * il valore più piccolo con questa proprietà è il PPCM L di tutti i periodi
 * animativi. A t = L le anomalie sono identiche a quelle della data per
 * qualsiasi epoca — non solo per la Terra, come invece accadeva col vecchio
 * "orologio di Giove" (fase gioviana · P_anim·terra), che lasciava gli altri
 * pianeti incoerenti fino a ±180°.
 */
export function simTimeForDate(earth: PlanetData, date: Date, allPlanets?: PlanetData[]): number {
  const list = allPlanets ?? [earth];
  const periods = list.map((p) => Math.round(p.animationDuration));
  if (periods.some((d) => d <= 0)) return 0;
  // PPCM di tutti i periodi animativi: ogni pianeta compie giri esatti in L secondi
  return periods.reduce((a, b) => (a * b) / gcd(a, b), 1);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
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
