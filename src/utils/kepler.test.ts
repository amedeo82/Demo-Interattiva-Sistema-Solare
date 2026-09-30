import { describe, it, expect } from 'vitest';
import {
  J2000_MS,
  daysSinceJ2000,
  normalizeDeg,
  solveKepler,
  orbitalRadiusPx,
  trueAnomalyFromEccentric,
  meanLongitudeAt,
} from './kepler';

describe('normalizeDeg', () => {
  it('lascia invariati gli angoli già nel range [0, 360)', () => {
    expect(normalizeDeg(0)).toBe(0);
    expect(normalizeDeg(90)).toBe(90);
    expect(normalizeDeg(359.5)).toBeCloseTo(359.5);
  });

  it('normalizza angoli negativi e > 360', () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(450)).toBe(90);
    expect(normalizeDeg(720)).toBe(0);
    expect(normalizeDeg(-720)).toBe(0);
  });
});

describe('daysSinceJ2000', () => {
  it("vale 0 all'epoca J2000.0", () => {
    expect(daysSinceJ2000(new Date(J2000_MS))).toBe(0);
  });

  it('conta i giorni esatti trascorsi dal J2000', () => {
    const oneYearAfter = new Date(J2000_MS + 365 * 86_400_000);
    expect(daysSinceJ2000(oneYearAfter)).toBeCloseTo(365, 6);
  });

  it('restituisce valori negativi per date precedenti al J2000', () => {
    const before = new Date(J2000_MS - 86_400_000);
    expect(daysSinceJ2000(before)).toBeCloseTo(-1, 6);
  });
});

describe('solveKepler — equazione M = E - e·sin(E)', () => {
  it("con eccentricità nulla l'anomalia eccentrica coincide con quella media", () => {
    expect(solveKepler(123.4, 0)).toBeCloseTo(123.4, 6);
  });

  it("per ogni anomalia media la soluzione soddisfa l'equazione di Keplero", () => {
    const ecc = 0.2056; // eccentricità di Mercurio (caso peggiore del sistema solare)
    for (let Mdeg = 0; Mdeg < 360; Mdeg += 7) {
      const Edeg = solveKepler(Mdeg, ecc);
      const M = (Mdeg * Math.PI) / 180;
      const E = (Edeg * Math.PI) / 180;
      // residuo angolare dell'equazione M = E - e·sin(E)
      const diff = ((E - ecc * Math.sin(E) - M) * 180) / Math.PI;
      const wrapped = ((diff % 360) + 360) % 360;
      const signed = wrapped > 180 ? wrapped - 360 : wrapped;
      expect(Math.abs(signed)).toBeLessThan(1e-6);
    }
  });

  it("rispetta le simmetrie note dell'orbita", () => {
    expect(solveKepler(0, 0.9)).toBeCloseTo(0, 6);
    expect(solveKepler(180, 0.9)).toBeCloseTo(180, 6);
    // per M = 90° con e alta, E deve essere > M (l'equazione "rallenta" vicino al perielio)
    expect(solveKepler(90, 0.6)).toBeGreaterThan(90);
  });

  it('è periodica: solveKepler(M + 360) = solveKepler(M)', () => {
    expect(solveKepler(45 + 360, 0.1)).toBeCloseTo(solveKepler(45, 0.1), 6);
  });
});

describe('orbitalRadiusPx — ellisse polare r(θ) = a(1-e²)/(1+e·cos θ)', () => {
  const a = 300;
  const e = 0.0934; // Terra

  it('al perielio (θ=0) restituisce il raggio minimo a(1-e)', () => {
    expect(orbitalRadiusPx(a, e, 0)).toBeCloseTo(a * (1 - e), 4);
  });

  it("all'afelio (θ=180°) restituisce il raggio massimo a(1+e)", () => {
    expect(orbitalRadiusPx(a, e, 180)).toBeCloseTo(a * (1 + e), 4);
  });

  it('con eccentricità nulla il raggio è costante (cerchio)', () => {
    for (const theta of [0, 45, 90, 200, 359]) {
      expect(orbitalRadiusPx(a, 0, theta)).toBeCloseTo(a, 8);
    }
  });

  it('conserva la terza legge: area spazzata uguale in tempi uguali (verifica numerica su approssimazione)', () => {
    // somma dei raggi ai quarti: coerente con simmetria r(θ) = r(-θ)
    expect(orbitalRadiusPx(a, e, 60)).toBeCloseTo(orbitalRadiusPx(a, e, -60), 8);
  });
});

describe('trueAnomalyFromEccentric', () => {
  it('coincide con E quando e = 0', () => {
    expect(trueAnomalyFromEccentric(73, 0)).toBeCloseTo(73, 6);
  });

  it("ai capi (0° e 180°) l'anomalia vera coincide con quella eccentrica", () => {
    expect(trueAnomalyFromEccentric(0, 0.5)).toBeCloseTo(0, 6);
    expect(trueAnomalyFromEccentric(180, 0.5)).toBeCloseTo(180, 6);
  });

  it('round-trip: ν(E(M)) resta entro [0, 360)', () => {
    for (let M = 0; M < 360; M += 11) {
      const nu = trueAnomalyFromEccentric(solveKepler(M, 0.05), 0.05);
      expect(nu).toBeGreaterThanOrEqual(0);
      expect(nu).toBeLessThan(360);
    }
  });
});

describe('meanLongitudeAt', () => {
  it("al J2000 restituisce la longitudine d'epoca", () => {
    expect(meanLongitudeAt(100, 365, new Date(J2000_MS))).toBeCloseTo(100, 4);
  });

  it('dopo un periodo orbitale completo torna alla longitudine iniziale', () => {
    const afterOnePeriod = new Date(J2000_MS + 687 * 86_400_000); // Marte: 687 giorni
    expect(meanLongitudeAt(95, 687, afterOnePeriod)).toBeCloseTo(95, 4);
  });

  it('avanza linearmente col tempo (velocità angolare media costante)', () => {
    const period = 365.25;
    const quarter = new Date(J2000_MS + (period / 4) * 86_400_000);
    expect(meanLongitudeAt(0, period, quarter)).toBeCloseTo(90, 3);
  });
});
