/**
 * Test del contatore di orbite (S4.4): verifica che il counter incrementi
 * correttamente quando l'angolo attraversa 0°/360° (wrap-around).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrbitCounters } from './useOrbitCounters';
import type { MutableRefObject } from 'react';
import type { SimPlanetState } from '../hooks/useOrbitEngine';

describe('useOrbitCounters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makePositions(): MutableRefObject<Record<string, SimPlanetState>> {
    return { current: { Earth: { angle: 90, radius: 130 } } } as MutableRefObject<
      Record<string, SimPlanetState>
    >;
  }

  it('parte a 0 orbite e incrementa al wrap-around (avanti)', () => {
    const positionsRef = makePositions();
    const { result } = renderHook(() => useOrbitCounters(positionsRef, ['Earth']));
    // S15 — il hook ritorna { counters, progress }; il test accede a
    // counters.current (ref) per retro-compat.
    const counters = result.current.counters;
    expect(counters.current['Earth'] ?? 0).toBe(0);
    // Simula un frame iniziale di assestamento
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // Primo wrap-around: angle passa da 90 a 0 (differenza = -90)
    // Non è un wrap-around (|diff| < 180)
    positionsRef.current.Earth = { angle: 0, radius: 130 };
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(counters.current['Earth'] ?? 0).toBe(0);
    // Secondo frame: 0 -> 359 (differenza = +359, > 180 → wrap forward)
    positionsRef.current.Earth = { angle: 359, radius: 130 };
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(counters.current['Earth'] ?? 0).toBe(1);
  });

  it('rileva wrap-around retrogrado (Venere, Urano)', () => {
    const positionsRef = { current: { Venus: { angle: 0, radius: 100 } } } as MutableRefObject<
      Record<string, SimPlanetState>
    >;
    const { result } = renderHook(() => useOrbitCounters(positionsRef, ['Venus']));
    const counters = result.current.counters;
    expect(counters.current['Venus'] ?? 0).toBe(0);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    positionsRef.current.Venus = { angle: 359, radius: 100 };
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(counters.current['Venus'] ?? 0).toBe(1);
  });

  it("S15 — espone la frazione (0..1) dell'orbita in corso", () => {
    // Questo test usa timer reali perché il loop interno usa rAF, che
    // vi.useFakeTimers() non avanza automaticamente.
    vi.useRealTimers();
    const positionsRef = makePositions();
    const { result } = renderHook(() => useOrbitCounters(positionsRef, ['Earth']));
    const progress = result.current.progress;
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Dopo init: fraction = 0
        expect(progress.current['Earth']?.count ?? 0).toBe(0);
        expect(progress.current['Earth']?.fraction ?? 0).toBe(0);
        // Sposta avanti di 90°: dopo alcuni frame fraction dovrebbe essere ~0.25
        positionsRef.current.Earth = { angle: 180, radius: 130 };
        setTimeout(() => {
          const frac = progress.current['Earth']?.fraction ?? 0;
          expect(frac).toBeGreaterThan(0.2);
          expect(frac).toBeLessThan(0.3);
          vi.useFakeTimers(); // restore
          resolve();
        }, 100);
      }, 50);
    });
  });
});
