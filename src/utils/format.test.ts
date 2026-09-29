import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatOrbitalPeriod,
  clamp,
  computeSystemScale,
  orbitDuration,
} from './format';

describe('formatNumber', () => {
  it('usa i separatori it-IT', () => {
    // it-IT usa il punto per le migliaia (NBSP in alcuni runtime Node: normalizza)
    expect(formatNumber(142984).replace(/\u00a0/g, '.')).toBe('142.984');
  });
});

describe('formatOrbitalPeriod', () => {
  it('sotto l\'anno mostra solo i giorni', () => {
    expect(formatOrbitalPeriod(88)).toContain('giorni');
    expect(formatOrbitalPeriod(88)).not.toContain('anni');
  });

  it('oltre l\'anno mostra anni e giorni', () => {
    const label = formatOrbitalPeriod(4333);
    expect(label).toContain('anni');
    expect(label).toContain('giorni');
    expect(label.startsWith('11.9')).toBe(true);
  });
});

describe('clamp', () => {
  it('limita entro min e max', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});

describe('computeSystemScale', () => {
  const STAGE = 800;

  it('restituisce al massimo 1', () => {
    expect(computeSystemScale(3000, 3000, STAGE)).toBe(1);
  });

  it('restituisce almeno 0.3 (minimo leggibile)', () => {
    expect(computeSystemScale(200, 200, STAGE)).toBe(0.3);
  });

  it('scala in base all\'altezza disponibile', () => {
    // 700px di altezza - 110 = 590 → 590/800 ≈ 0.7375
    expect(computeSystemScale(2000, 700, STAGE)).toBeCloseTo(590 / 800, 4);
  });

  it('deduce la sidebar solo sopra i 1024px', () => {
    const desktop = computeSystemScale(1024, 3000, STAGE);
    const mobile = computeSystemScale(1023, 3000, STAGE);
    expect(desktop).toBeLessThan(mobile);
  });
});

describe('orbitDuration', () => {
  it('divide la durata base per la velocità', () => {
    expect(orbitDuration(10, 2)).toBe(5);
    expect(orbitDuration(10, 0.5)).toBe(20);
  });

  it('è robusto a velocità non valide (>0)', () => {
    expect(orbitDuration(10, 0)).toBe(10);
    expect(orbitDuration(10, -1)).toBe(10);
  });
});
