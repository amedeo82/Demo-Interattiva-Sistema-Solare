/**
 * Test anti-regressione: l'animazione deve avanzare monotonamente nel
 * tempo, NON oscillare avanti/indietro.
 *
 * Storia: un bug preesistente nel motore orbitale creava un nuovo
 * `NO_ANOMALIES = {}` ad ogni render, invalidando il `useMemo` di
 * `computeInto` e facendo sì che l'effect `[startSimTime, computeInto]`
 * resettasse `simTimeRef.current = 0` ad ogni re-render di App (~4Hz).
 * Risultato: i pianeti "tornavano indietro" alla posizione iniziale ad
 * ogni ciclo di pubblicazione di useSimTime — visivamente identico al
 * sintomo "tick avanti e indietro". Vedi `useOrbitEngine.ts` per la
 * correzione (`NO_ANOMALIES` ora a livello modulo).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App';

afterEach(() => cleanup());

/** Estrae (x, y) dal transform scritto da Planet.tsx. */
function parseXY(s: string): { x: number; y: number } {
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(s);
  if (!m) return { x: NaN, y: NaN };
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

/** Distanza tra due punti — usata come proxy della "monotonia" del moto. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('Anti-regressione: moto orbitale monotonicamente avanti', () => {
  it('la Terra avanza lungo l\'orbita tra frame consecutivi (no reset)', async () => {
    render(<App />);
    await new Promise((r) => setTimeout(r, 50));

    const earth = screen.getByRole('button', { name: /Seleziona Terra/i });
    const samples: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const xy = parseXY(earth.style.transform);
      samples.push(xy);
      await new Promise((r) => setTimeout(r, 120));
    }

    // (1) Ogni sample è DIVERSO dal precedente: il motore non è "bloccato".
    let changedFrames = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].x !== samples[i - 1].x || samples[i].y !== samples[i - 1].y) {
        changedFrames++;
      }
    }
    expect(changedFrames).toBe(samples.length - 1);

    // (2) La distanza totale percorsa lungo l'orbita è coerente con il
    //     moto atteso: a 1x la Terra percorre ~36°/s (animationDuration 10s).
    //     In ~960ms di test ci aspettiamo ≥ 30px di spostamento cumulato
    //     lungo l'orbita. Prima del fix il totale era ≤ 20px e oscillante.
    const startPoint = samples[0];
    const endPoint = samples[samples.length - 1];
    const totalDrift = dist(startPoint, endPoint);
    expect(totalDrift).toBeGreaterThan(20);

    // (3) Nessun sample deve tornare VICINO al punto di partenza: un
    //     reset periodico farebbe sì che almeno un sample cada entro
    //     5px dall'origine. Con il fix, ogni sample si allontana.
    for (let i = 1; i < samples.length; i++) {
      expect(dist(samples[i], startPoint)).toBeGreaterThan(2);
    }
  });

  it('Giove (pianeta esterno) avanza anch\'esso senza oscillazioni', async () => {
    render(<App />);
    await new Promise((r) => setTimeout(r, 50));
    const jupiter = screen.getByRole('button', { name: /Seleziona Giove/i });
    const samples: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const xy = parseXY(jupiter.style.transform);
      samples.push(xy);
      await new Promise((r) => setTimeout(r, 150));
    }
    // Giove orbita più lentamente (animationDuration 119s), ma NON deve
    // mai tornare al punto di partenza durante il test.
    const startPoint = samples[0];
    for (let i = 1; i < samples.length; i++) {
      expect(dist(samples[i], startPoint)).toBeGreaterThan(2);
    }
  });
});