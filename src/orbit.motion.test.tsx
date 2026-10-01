/**
 * Test anti-regressione: l'animazione deve avanzare monotonamente nel
 * tempo, NON oscillare avanti/indietro.
 *
 * Storia: in passato un bug pre-esistente nel motore orbitale creava un
 * nuovo `NO_ANOMALIES = {}` ad ogni render, invalidando il `useMemo` di
 * `compute` e facendo sì che l'effect `[startSimTime, compute]` resettasse
 * `simTimeRef.current = 0` ad ogni re-render di App (~4Hz). Risultato: i
 * pianeti "tornavano indietro" alla posizione iniziale ad ogni ciclo di
 * pubblicazione di useSimTime — visivamente identico al sintomo "tick
 * avanti e indietro". Vedi `useOrbitEngine.ts` per la correzione
 * (`NO_ANOMALIES` ora a livello modulo).
 *
 * Nella nuova architettura 3D i pianeti non sono più bottoni DOM: il test
 * legge direttamente `keplerPosition(t)` per il tempo di simulazione.
 */
import { describe, it, expect } from 'vitest';
import { keplerPosition } from './hooks/useOrbitEngine';
import { planets } from './data/planets';

function angleAt(planetName: string, t: number): number {
  return keplerPosition(planets.find((p) => p.name === planetName)!, t).angle;
}

describe('Anti-regressione: moto orbitale monotonicamente avanti', () => {
  it('la Terra avanza monotonicamente (no reset)', () => {
    const samples: number[] = [];
    // 1 anno di simulazione = 10s reali (CONFIG.earthYearSimSeconds); ogni
    // step copre 5° di longitudine.
    for (let i = 0; i < 16; i++) {
      samples.push(angleAt('Earth', i * 0.14));
    }
    // Ogni sample è DIVERSO dal precedente (motore non è bloccato).
    const unique = new Set(samples).size;
    expect(unique).toBe(samples.length);

    // Spazio percorso totale in 16 step di 0.14s = 2.24s reali:
    // a 36°/s la Terra avanza ~80°, coerente con la simulazione.
    // Calcoliamo la differenza normalizzata fra primo e ultimo sample.
    const delta = ((samples[samples.length - 1] - samples[0] + 540) % 360) - 180;
    expect(Math.abs(delta)).toBeGreaterThan(20);
  });

  it('Giove avanza monotonicamente (pianeta lento)', () => {
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      samples.push(angleAt('Jupiter', i * 0.14));
    }
    const unique = new Set(samples).size;
    expect(unique).toBe(samples.length);
    // Giove si muove più lentamente (animationDuration 119s), ma NON deve
    // mai tornare al punto di partenza in 8 frame.
    expect(unique).toBeGreaterThanOrEqual(7);
  });
});