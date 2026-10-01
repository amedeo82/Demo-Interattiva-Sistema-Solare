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
    return { current: { Earth: { angle: 90, radius: 130 } } } as MutableRefObject<Record<string, SimPlanetState>>;
  }

  it('parte a 0 orbite e incrementa al wrap-around (avanti)', () => {
    const positionsRef = makePositions();
    const { result } = renderHook(() =>
      useOrbitCounters(positionsRef, ['Earth'])
    );
    expect(result.current.current['Earth'] ?? 0).toBe(0);
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
    expect(result.current.current['Earth'] ?? 0).toBe(0);
    // Secondo frame: 0 -> 359 (differenza = +359, > 180 → wrap forward)
    positionsRef.current.Earth = { angle: 359, radius: 130 };
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.current['Earth'] ?? 0).toBe(1);
  });

  it('rileva wrap-around retrogrado (Venere, Urano)', () => {
    const positionsRef = { current: { Venus: { angle: 0, radius: 100 } } } as MutableRefObject<Record<string, SimPlanetState>>;
    const { result } = renderHook(() => useOrbitCounters(positionsRef, ['Venus']));
    expect(result.current.current['Venus'] ?? 0).toBe(0);
    act(() => { vi.advanceTimersByTime(20); });
    positionsRef.current.Venus = { angle: 359, radius: 100 };
    act(() => { vi.advanceTimersByTime(20); });
    expect(result.current.current['Venus'] ?? 0).toBe(1);
  });
});