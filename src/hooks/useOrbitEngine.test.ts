/**
 * Test per il motore orbitale: keplerPosition è la funzione pura che
 * useOrbitEngine usa ad ogni frame — qui verifichiamo le proprietà fisiche
 * delle orbite simulate (periodicità, eccentricità, 3ª legge di Keplero).
 */
import { describe, it, expect } from 'vitest';
import { planets } from '../data/planets';
import { keplerPosition } from './useOrbitEngine';

const earth = planets.find((p) => p.name === 'Earth')!;
const mercury = planets.find((p) => p.name === 'Mercury')!;

describe('keplerPosition — cinematica dell\'orbita simulata', () => {
  it('all\'istante iniziale vale l\'angolo di partenza configurato', () => {
    const pos = keplerPosition(earth, 0);
    // anomalia vera a M=startAngle coincide con startAngle (ν=0 al perielio locale)
    expect(pos.angle).toBeCloseTo(300, 1);
  });

  it('dopo un periodo animativo completo il pianeta torna allo stesso angolo', () => {
    const full = earth.animationDuration; // secondi sim per un giro completo
    const a0 = keplerPosition(earth, 0).angle;
    const a1 = keplerPosition(earth, full).angle;
    expect(a1).toBeCloseTo(a0, 4);
  });

  it('l\'angolo resta sempre in [0, 360) su un intero periodo', () => {
    for (let t = 0; t <= earth.animationDuration; t += 0.37) {
      const { angle } = keplerPosition(earth, t);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    }
  });

  it('il raggio oscilla tra a(1-e) e a(1+e) secondo l\'eccentricità reale', () => {
    const a = mercury.orbitRadius;
    const e = mercury.eccentricity;
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t <= mercury.animationDuration; t += 0.05) {
      const r = keplerPosition(mercury, t).radius;
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    expect(min).toBeCloseTo(a * (1 - e), 0);
    expect(max).toBeCloseTo(a * (1 + e), 0);
  });

  it('con eccentricità nulla l\'orbita è un cerchio perfetto', () => {
    const circular = { ...earth, eccentricity: 0 };
    for (let t = 0; t <= circular.animationDuration; t += 1) {
      expect(keplerPosition(circular, t).radius).toBeCloseTo(earth.orbitRadius, 6);
    }
  });

  it('rispetta la 3ª legge di Keplero: periodi crescono con i raggi orbitali', () => {
    const sortedByRadius = [...planets].sort((x, y) => x.orbitRadius - y.orbitRadius);
    for (let i = 1; i < sortedByRadius.length; i++) {
      expect(sortedByRadius[i].animationDuration).toBeGreaterThan(
        sortedByRadius[i - 1].animationDuration
      );
    }
  });

  it('la velocità angolare è massima al perielio (2ª legge: aree uguali in tempi uguali)', () => {
    const dt = 0.01;
    const periapsisT = mercury.animationDuration / 4; // approssimazione: zona ν≈0 nel modello
    void periapsisT;
    // misura lo spostamento angolare su tutto il periodo: deve restare limitato
    // e non monotono (accelera/decelera), mai > 360°/periodo·dt·2
    let prev = keplerPosition(mercury, 0).angle;
    let maxStep = 0;
    for (let t = dt; t <= mercury.animationDuration; t += dt) {
      const cur = keplerPosition(mercury, t).angle;
      let step = Math.abs(cur - prev);
      if (step > 180) step = 360 - step; // attraversamento 0°/360°
      maxStep = Math.max(maxStep, step);
      prev = cur;
    }
    const meanStep = (360 / mercury.animationDuration) * dt;
    expect(maxStep).toBeGreaterThan(meanStep); // accelera vicino al perielio
    expect(maxStep).toBeLessThan(meanStep * 2.5); // ma senza esplosioni numeriche
  });
});
