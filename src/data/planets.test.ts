import { describe, it, expect } from 'vitest';
import { planets } from '../data/planets';

describe('dati dei pianeti', () => {
  it('contiene tutti gli 8 pianeti del sistema solare', () => {
    expect(planets).toHaveLength(8);
    expect(planets.map((p) => p.name)).toEqual([
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ]);
  });

  it('ogni pianeta ha campi obbligatori valorizzati', () => {
    for (const p of planets) {
      expect(p.name).toBeTruthy();
      expect(p.nameIt).toBeTruthy();
      expect(p.symbol).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('i valori numerici sono positivi', () => {
    for (const p of planets) {
      expect(p.diameter).toBeGreaterThan(0);
      expect(p.distanceFromSun).toBeGreaterThan(0);
      expect(p.orbitalPeriod).toBeGreaterThan(0);
      expect(p.size).toBeGreaterThan(0);
      expect(p.orbitRadius).toBeGreaterThan(0);
      expect(p.animationDuration).toBeGreaterThan(0);
    }
  });

  it('orbite e dimensioni crescono con la distanza dal Sole (rappresentazione schematica)', () => {
    for (let i = 1; i < planets.length; i++) {
      expect(planets[i].orbitRadius).toBeGreaterThan(planets[i - 1].orbitRadius);
      expect(planets[i].distanceFromSun).toBeGreaterThan(planets[i - 1].distanceFromSun);
    }
  });

  it('le durate animate crescono con il periodo orbitale (coerenza visiva)', () => {
    for (let i = 1; i < planets.length; i++) {
      expect(planets[i].animationDuration).toBeGreaterThanOrEqual(planets[i - 1].animationDuration);
    }
  });
});
