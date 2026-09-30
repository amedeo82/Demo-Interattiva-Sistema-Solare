/**
 * Regressione "scena bloccata": il motore deve mantenere SEMPRE allineati
 * clock (simTimeRef) e buffer posizioni, anche quando l'epoca iniziale non è
 * 0 (selezione di una data → startSimTime = PPCM dei periodi animativi).
 * useRef(startSimTime) NON è lazy-init: senza riallineamento esplicito negli
 * effect, il loop rAF scriveva posizioni a t≈0 mentre il buffer era fermo a
 * t₀≠0 → pianeti congelati o che scattavano a ogni ri-calcolo.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { planets } from '../data/planets';
import { useOrbitEngine, keplerPosition } from './useOrbitEngine';

const earth = planets.find((p) => p.name === 'Earth')!;

function mockRaf() {
  let id = 0;
  const cbs = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (cbs.set(++id, cb), id));
  vi.stubGlobal('cancelAnimationFrame', (cid: number) => cbs.delete(cid));
  let nowMs = 0;
  return {
    pump(n: number, stepMs = 16.7) {
      for (let i = 0; i < n; i++) {
        nowMs += stepMs;
        const pending = Array.from(cbs.values());
        cbs.clear();
        for (const cb of pending) cb(nowMs);
      }
    },
  };
}

describe('useOrbitEngine — coerenza clock/buffer (anti-stallo)', () => {
  it('montaggio con epoca iniziale ≠ 0: il buffer riparte da t0 e avanza col clock', () => {
    const raf = mockRaf();
    const T0 = 2100; // PPCM dei periodi animativi (valore di simTimeForDate)
    const starts = Object.fromEntries(planets.map((p) => [p.name, 0]));
    const { result } = renderHook(() => useOrbitEngine(planets, true, 1, starts, T0, undefined));
    // dopo il mount il buffer deve essere già coerente con l'epoca
    expect(result.current.positionsRef.current[earth.name].angle).toBeCloseTo(
      keplerPosition(earth, T0, 0).angle,
      6
    );
    raf.pump(30); // ~0.5 s simulati
    const t = result.current.simTimeRef.current;
    expect(t).toBeGreaterThan(T0 + 0.4); // il clock riparte da t0, non da 0
    expect(result.current.positionsRef.current[earth.name].angle).toBeCloseTo(
      keplerPosition(earth, t, 0).angle,
      4
    );
    vi.unstubAllGlobals();
  });

  it('cambio epoca (data scelta): simTime e posizioni riallineati, loop vivo', () => {
    const raf = mockRaf();
    const P = earth.animationDuration;
    const { rerender, result } = renderHook(
      ({ t0 }: { t0: number }) => useOrbitEngine(planets, true, 1, undefined, t0),
      { initialProps: { t0: 0 } }
    );
    rerender({ t0: P }); // nuova epoca dopo il mount
    raf.pump(30); // ~0.5 s simulati
    const t = result.current.simTimeRef.current;
    expect(t).toBeGreaterThan(P + 0.4);
    const angle = result.current.positionsRef.current[earth.name].angle;
    expect(angle).not.toBeCloseTo(keplerPosition(earth, P, 300).angle, 1); // si muove!
    expect(angle).toBeCloseTo(keplerPosition(earth, t, 300).angle, 4);
    vi.unstubAllGlobals();
  });
});
