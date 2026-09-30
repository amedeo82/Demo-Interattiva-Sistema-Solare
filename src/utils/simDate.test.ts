/**
 * Coerenza data → simulazione: offset angolari e simTime di partenza devono
 * derivare dalla STESSA anomalia media, così che la longitudine dei pianeti
 * in scena corrisponda sempre alla data mostrata in sidebar — anche per epoche
 * lontane da J2000. Il vecchio codice usava la longitudine assoluta come
 * offset (incoerente col modello a perielio locale) e un simTime basato sul
 * solo `% periodo` terrestre: le due quantità non erano sincronizzate e i
 * pianeti con periodi non commensurabili con l'anno apparivano fuori posto.
 */
import { describe, it, expect } from 'vitest';
import { planets } from '../data/planets';
import { keplerPosition } from '../hooks/useOrbitEngine';
import { meanAnomalyAtDate, meanLongitudeAt, J2000_MS } from './kepler';
import { anglesForDate, simTimeForDate } from './simDate';

const earth = planets.find((p) => p.name === 'Earth')!;

describe('meanAnomalyAtDate', () => {
  it('al J2000 vale 0 per ogni pianeta (perielio locale della simulazione)', () => {
    for (const p of planets) {
      expect(meanAnomalyAtDate(p, new Date(J2000_MS))).toBeCloseTo(0, 4);
    }
  });

  it('dopo un periodo orbitale completo torna a 0', () => {
    const mars = planets.find((p) => p.name === 'Mars')!;
    const afterOnePeriod = new Date(J2000_MS + mars.orbitalPeriod * 86_400_000);
    expect(meanAnomalyAtDate(mars, afterOnePeriod)).toBeCloseTo(0, 4);
  });

  it("avanza linearmente: a metà periodo l'anomalia è 180°", () => {
    const half = new Date(J2000_MS + (earth.orbitalPeriod / 2) * 86_400_000);
    expect(meanAnomalyAtDate(earth, half)).toBeCloseTo(180, 2);
  });
});

describe('anglesForDate / simTimeForDate — coerenza con il motore kepleriano', () => {
  const dates = [
    new Date(J2000_MS), // epoca di riferimento
    new Date(Date.UTC(2026, 8, 30, 12)), // "oggi"
    new Date(Date.UTC(2031, 5, 15, 12)), // futura, lontano da J2000
    new Date(Date.UTC(1985, 1, 20, 12)), // passata
  ];

  it('a t = startSimTime TUTTI i pianeti sono alla longitudine media della data (± equazione di Keplero)', () => {
    // Proprietà chiave (invariante del MOTORE): gli offset angolari sono le
    // anomalie medie M0 = λ−ϖ della data (anglesForDate) e il tempo di
    // partenza t₀ è il PPCM dei periodi animativi (simTimeForDate). Il motore
    // fa avanzare ogni pianeta di 360·t/P_anim, quindi a t₀ l'avanzamento è un
    // multiplo intero di 360 per OGNI pianeta: la longitudine mostrata resta
    // quella reale della data, a qualsiasi epoca — non solo per la Terra.
    for (const date of dates) {
      const starts = anglesForDate(planets, date);
      const t0 = simTimeForDate(earth, date, planets);
      expect(t0 % earth.animationDuration).toBeCloseTo(0, 9);
      for (const p of planets) {
        const pos = keplerPosition(p, t0, starts[p.name]);
        const lambdaReal = meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date);
        let diff = Math.abs(pos.angle - lambdaReal) % 360;
        if (diff > 180) diff = 360 - diff;
        // lo scarto è al massimo l'equazione del centro (≈2e in radianti)
        expect(diff).toBeLessThan((2 * p.eccentricity * 180) / Math.PI + 0.5);
      }
    }
  });

  it('l’avanzamento animativo è periodico: a t₀+Δ vale la configurazione della data + Δ giorni', () => {
    // Dopo l’epoca iniziale il calendario in sidebar avanza di
    // Δgiorni = Δt · P_reale/P_anim (App.tsx: daysPerSec). Verifichiamo che
    // dopo un quarto d’anno terrestre la scena mostri davvero λ(data+Δ):
    // coerenza fra data mostrata e posizioni, anche in riproduzione.
    const date = new Date(Date.UTC(2031, 5, 15, 12));
    const starts = anglesForDate(planets, date);
    const t0 = simTimeForDate(earth, date, planets);
    const quarterDays = earth.orbitalPeriod / 4;
    const deltaT = (quarterDays / earth.orbitalPeriod) * earth.animationDuration;
    const advanced = new Date(date.getTime() + quarterDays * 86_400_000);
    for (const p of planets) {
      const pos = keplerPosition(p, t0 + deltaT, starts[p.name]);
      const lambdaReal = meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, advanced);
      let diff = Math.abs(pos.angle - lambdaReal) % 360;
      if (diff > 180) diff = 360 - diff;
      expect(diff).toBeLessThan((2 * p.eccentricity * 180) / Math.PI + 0.5);
    }
  });

  it("simTimeForDate è un multiplo intero del periodo animativo di ogni pianeta", () => {
    // È la condizione necessaria e sufficiente perché, partito da t₀,
    // ogni pianeta compia giri completi esatti e resti sincronizzato
    // con la data: 360·t₀/P_anim(p) ≡ 0 (mod 360)  ∀ p.
    for (const date of dates) {
      const t = simTimeForDate(earth, date, planets);
      expect(t).toBeGreaterThanOrEqual(0);
      for (const p of planets) {
        expect((360 / p.animationDuration) * t % 360).toBeCloseTo(0, 6);
      }
    }
  });

  it('offset e tempo sono puri: stesse date → stessi valori', () => {
    const d = new Date(Date.UTC(2031, 5, 15, 12));
    expect(anglesForDate(planets, d)).toEqual(anglesForDate(planets, d));
    expect(simTimeForDate(earth, d)).toBe(simTimeForDate(earth, d));
  });
});
