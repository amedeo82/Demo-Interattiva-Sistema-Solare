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
import { meanAnomalyAtDate, meanLongitudeAt, J2000_MS, normalizeDeg } from './kepler';
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

  it('la longitudine del motore a t=startSimTime è quella reale della data (± equazione di Keplero)', () => {
    // Proprietà chiave: partendo dagli offset M0 = λ−ϖ della data e dal tempo
    // t = M0_terra/360·anno, l'anomalia media del motore per OGNI pianeta è
    //   M(t) = M0 + 360·t/P_anim = (λ−ϖ) + avanzamento terrestre della data
    //        = λ(data) − ϖ
    // cioè esatta rispetto ai dati orbitali reali. L'angolo VERO differisce da
    // quello medio al massimo dell'equazione del centro (~2e rad).
    const daysSinceJ2000 = (d: Date) => (d.getTime() - J2000_MS) / 86_400_000;
    for (const date of dates) {
      const starts = anglesForDate(planets, date);
      const t = simTimeForDate(earth, date);
      const dEarth = daysSinceJ2000(date);
      for (const p of planets) {
        const pos = keplerPosition(p, t, starts[p.name]);
        // longitudine media reale alla data
        const lambdaMean = meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date);
        // anomalia media reale alla data (λ − ϖ, con ϖ ≈ λ_J2000 nel modello)
        void lambdaMean;
        const mReal = meanAnomalyAtDate(p, date);
        // anomalia media raggiunta dal motore: M0 + n·t, con n·t = avanzamento
        // terrestre espresso nella scala del pianeta: 360·t/P_anim = 360·d/P_terra
        const mSim = normalizeDeg(starts[p.name] + (360 / earth.orbitalPeriod) * dEarth);
        expect(Math.abs(mSim - mReal)).toBeLessThan(1e-6);
        // scarto angolo vero vs medio: entro l'equazione del centro
        let diff = Math.abs(pos.angle - mSim) % 360;
        if (diff > 180) diff = 360 - diff;
        expect(diff).toBeLessThan((2 * p.eccentricity * 180) / Math.PI + 0.5);
      }
    }
  });

  it("il tempo di partenza porta la Terra all'anomalia media della data scelta", () => {
    for (const date of dates) {
      const starts = anglesForDate(planets, date);
      const t = simTimeForDate(earth, date);
      const mEarth = normalizeDeg(starts.Earth + (360 / earth.animationDuration) * t);
      // M(Terra, data) = 360 · giorni/J2000 / periodo (ϖ ignorato: coincide)
      const d = (date.getTime() - J2000_MS) / 86_400_000;
      expect(mEarth).toBeCloseTo(normalizeDeg((360 / earth.orbitalPeriod) * d), 4);
    }
  });

  it("simTimeForDate è sempre nell'anno corrente [0, durata anno)", () => {
    for (const date of dates) {
      const t = simTimeForDate(earth, date);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(earth.animationDuration);
    }
  });

  it('offset e tempo sono puri: stesse date → stessi valori', () => {
    const d = new Date(Date.UTC(2031, 5, 15, 12));
    expect(anglesForDate(planets, d)).toEqual(anglesForDate(planets, d));
    expect(simTimeForDate(earth, d)).toBe(simTimeForDate(earth, d));
  });
});
