/**
 * S14 · F11 — Test per logScale e meanOrbitalVelocity.
 */
import { describe, it, expect } from 'vitest';
import { logScale, meanOrbitalVelocity } from './logScale';

describe('logScale', () => {
  it('min → 0, max → 1', () => {
    expect(logScale(10, 10, 100)).toBe(0);
    expect(logScale(100, 10, 100)).toBe(1);
  });

  it('valori intermedi proporzionali in scala log', () => {
    // log10(1+10)=1.04, log10(1+55)=1.75, log10(1+100)=2.01
    const mid = logScale(55, 10, 100);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.8);
  });

  it('clamp fuori range', () => {
    expect(logScale(5, 10, 100)).toBe(0);
    expect(logScale(1000, 10, 100)).toBe(1);
  });

  it('range degenere → 1 se v ≥ max, 0 altrimenti', () => {
    expect(logScale(50, 50, 50)).toBe(1);
    expect(logScale(10, 50, 50)).toBe(0);
  });

  it('input non finiti → 0', () => {
    expect(logScale(NaN, 0, 10)).toBe(0);
    expect(logScale(Infinity, 0, 10)).toBe(1);
  });
});

describe('meanOrbitalVelocity', () => {
  it('Terra ≈ 29.8 km/s', () => {
    expect(meanOrbitalVelocity(149.6)).toBeCloseTo(29.78, 1);
  });

  it('Mercurio più veloce della Terra, Nettuno più lento', () => {
    const mercury = meanOrbitalVelocity(57.9);
    const earth = meanOrbitalVelocity(149.6);
    const neptune = meanOrbitalVelocity(4495.1);
    expect(mercury).toBeGreaterThan(earth);
    expect(neptune).toBeLessThan(earth);
  });

  it('distanza non positiva → 0', () => {
    expect(meanOrbitalVelocity(0)).toBe(0);
    expect(meanOrbitalVelocity(-5)).toBe(0);
  });
});
