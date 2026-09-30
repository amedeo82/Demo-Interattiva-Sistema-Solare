import { describe, it, expect } from 'vitest';
import { mulberry32 } from './random';

describe('mulberry32', () => {
  it('è deterministico: stessa seed → stessa sequenza', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produce valori in [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('seed diversi producono sequenze diverse', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});
