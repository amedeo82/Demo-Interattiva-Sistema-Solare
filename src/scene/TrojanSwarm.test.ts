/**
 * S12 · F5 — Test per generateTrojans.
 */
import { describe, it, expect } from 'vitest';
import { generateTrojans } from './TrojanSwarm';

describe('generateTrojans', () => {
  it('L4: tutte le libration sono positive (~+60° centro)', () => {
    const trojans = generateTrojans(80, 1, 42);
    expect(trojans.length).toBe(80);
    for (const t of trojans) {
      expect(t.libration).toBeGreaterThan(0);
      // centro +60° ± 15°
      expect(t.libration).toBeGreaterThanOrEqual(45);
      expect(t.libration).toBeLessThanOrEqual(75);
    }
  });

  it('L5: tutte le libration sono negative', () => {
    const trojans = generateTrojans(80, -1, 42);
    for (const t of trojans) {
      expect(t.libration).toBeLessThan(0);
      expect(t.libration).toBeGreaterThanOrEqual(-75);
      expect(t.libration).toBeLessThanOrEqual(-45);
    }
  });

  it('stesso seed → stesso array (determinismo)', () => {
    const a = generateTrojans(50, 1, 123);
    const b = generateTrojans(50, 1, 123);
    expect(a).toEqual(b);
  });

  it('seed diverso → array diverso', () => {
    const a = generateTrojans(50, 1, 1);
    const b = generateTrojans(50, 1, 2);
    expect(a).not.toEqual(b);
  });

  it('colori in palette C/S/M', () => {
    const trojans = generateTrojans(50, 1, 7);
    for (const t of trojans) {
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
