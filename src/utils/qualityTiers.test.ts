/**
 * S10a · M4 — Test per il quality governor (puro).
 */
import { describe, it, expect } from 'vitest';
import {
  QUALITY_TIERS,
  DOWN_THRESHOLD_FPS,
  STALL_THRESHOLD_FPS,
  UP_THRESHOLD_FPS,
  nextTier,
  type GovernorInput,
} from './qualityTiers';

const base: GovernorInput = {
  fps: 60,
  tier: 0,
  initialTier: 0,
  lastChangeMs: 0,
  now: 1000,
  lowWindowsInARow: 0,
  highDwellMs: 0,
};

describe('nextTier', () => {
  it('FPS neutri (60) → stay', () => {
    const out = nextTier(base);
    expect(out.change).toBe('stay');
    expect(out.tier).toBe(0);
  });

  it('FPS sotto STALL → down immediato', () => {
    const out = nextTier({ ...base, fps: STALL_THRESHOLD_FPS - 1 });
    expect(out.change).toBe('down');
    expect(out.tier).toBe(1);
  });

  it('3 finestre sotto DOWN → down', () => {
    const in0: GovernorInput = { ...base, fps: DOWN_THRESHOLD_FPS - 5 };
    const out0 = nextTier(in0);
    expect(out0.change).toBe('stay');
    expect(out0.lowWindowsInARow).toBe(1);
    const in1: GovernorInput = {
      ...in0,
      now: in0.now + 2000,
      lowWindowsInARow: out0.lowWindowsInARow,
      lastChangeMs: out0.lastChangeMs,
      highDwellMs: out0.highDwellMs,
      tier: out0.tier,
    };
    const out1 = nextTier(in1);
    expect(out1.change).toBe('stay');
    const in2: GovernorInput = {
      ...in1,
      now: in1.now + 2000,
      lowWindowsInARow: out1.lowWindowsInARow,
      lastChangeMs: out1.lastChangeMs,
      highDwellMs: out1.highDwellMs,
      tier: out1.tier,
    };
    const out2 = nextTier(in2);
    expect(out2.change).toBe('down');
    expect(out2.tier).toBe(1);
  });

  it('non sale sopra initialTier', () => {
    // tier 2 (mobile) con initialTier 2 → up non deve andare a 1
    const out = nextTier({
      ...base,
      fps: UP_THRESHOLD_FPS + 5,
      tier: 2,
      initialTier: 2,
      highDwellMs: 10_000,
      now: 100_000, // > cooldown
    });
    expect(out.change).toBe('stay');
    expect(out.tier).toBe(2);
  });

  it('sale con dwell + cooldown rispettati', () => {
    const out = nextTier({
      ...base,
      fps: UP_THRESHOLD_FPS + 5,
      tier: 2,
      initialTier: 0,
      highDwellMs: 6_000,
      lastChangeMs: 0,
      now: 100_000, // >> cooldown
    });
    expect(out.change).toBe('up');
    expect(out.tier).toBe(1);
  });

  it('non sale se cooldown non passato', () => {
    const out = nextTier({
      ...base,
      fps: UP_THRESHOLD_FPS + 5,
      tier: 2,
      initialTier: 0,
      highDwellMs: 6_000,
      lastChangeMs: 99_000,
      now: 100_000, // solo 1s da ultimo cambio
    });
    expect(out.change).toBe('stay');
  });

  it('clamp al tier massimo (non scende sotto 3)', () => {
    const out = nextTier({ ...base, tier: 3, initialTier: 0, fps: 5 });
    expect(out.tier).toBe(3);
  });

  it('QUALITY_TIERS ha 4 livelli dal max al min', () => {
    expect(QUALITY_TIERS.length).toBe(4);
    expect(QUALITY_TIERS[0].dpr).toBeGreaterThan(QUALITY_TIERS[3].dpr);
  });
});
