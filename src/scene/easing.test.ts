import { describe, it, expect } from 'vitest';
import { easeInOutCubic, easeOutCubic, easeInQuad, clamp01 } from './easing';

describe('easing', () => {
  it('easeInOutCubic — boundary values 0 e 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('easeInOutCubic — simmetria: ease(0.5) ≈ 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });

  it('easeInOutCubic — monotonicamente crescente in [0,1]', () => {
    let prev = easeInOutCubic(0);
    for (let i = 1; i <= 100; i++) {
      const v = easeInOutCubic(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('easeOutCubic — boundary + monotonicità', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    let prev = 0;
    for (let i = 1; i <= 50; i++) {
      const v = easeOutCubic(i / 50);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('easeInQuad — accelera dalla partenza', () => {
    expect(easeInQuad(0)).toBe(0);
    expect(easeInQuad(0.5)).toBe(0.25);
    expect(easeInQuad(1)).toBe(1);
  });

  it('clamp01 — taglia valori fuori range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });
});
