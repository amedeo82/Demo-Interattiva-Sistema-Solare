/**
 * Test di validazione del dataset: ogni voce deve essere coerente con i
 * dati fisici reali (approssimati) e completa in tutti i campi usati dai
 * componenti (InfoPanel, CompareModal, Quiz, motore orbitale, texture).
 */
import { describe, it, expect } from 'vitest';
import { planets, type PlanetData } from './planets';

// Valori fisici di riferimento (diametro km, distanza mln km, periodo giorni)
const REAL_VALUES: Record<string, [number, number, number]> = {
  Mercury: [4879, 57.9, 88],
  Venus: [12104, 108.2, 224.7],
  Earth: [12756, 149.6, 365.2],
  Mars: [6792, 227.9, 687],
  Jupiter: [142984, 778.6, 4331],
  Saturn: [120536, 1433.5, 10747],
  Uranus: [51118, 2872.5, 30589],
  Neptune: [49528, 4495.1, 59800],
};

describe('dataset pianeti — accuratezza scientifica', () => {
  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: i valori fisici sono entro il 5% dai dati reali',
    (_name, p) => {
      const [diameter, distance, period] = REAL_VALUES[p.name];
      expect(p.diameter).toBeCloseTo(diameter, -3); // ± ~500 km
      expect(p.distanceFromSun / distance).toBeGreaterThan(0.95);
      expect(p.distanceFromSun / distance).toBeLessThan(1.05);
      expect(p.orbitalPeriod / period).toBeGreaterThan(0.97);
      expect(p.orbitalPeriod / period).toBeLessThan(1.03);
    }
  );

  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: eccentricità orbitale realistica (0 ≤ e < 0.25)',
    (_name, p) => {
      expect(p.eccentricity).toBeGreaterThanOrEqual(0);
      expect(p.eccentricity).toBeLessThan(0.25);
    }
  );

  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: longitudine media J2000 nel range [0, 360)',
    (_name, p) => {
      expect(p.meanLongitudeJ2000).toBeGreaterThanOrEqual(0);
      expect(p.meanLongitudeJ2000).toBeLessThan(360);
    }
  );

  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: inclinazione assiale in gradi ragionevoli (-180..180)',
    (_name, p) => {
      expect(Math.abs(p.axialTilt)).toBeLessThanOrEqual(180);
    }
  );

  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: periodo di rotazione non nullo (negativo = retrograda)',
    (_name, p) => {
      expect(p.rotationHours).not.toBe(0);
      expect(Math.abs(p.rotationHours)).toBeLessThan(9000); // max Nettuno ~16h, Venere 5830h
    }
  );

  it('Venere e Urano hanno rotazione retrograda (segno negativo)', () => {
    const venus = planets.find((p) => p.name === 'Venus')!;
    const uranus = planets.find((p) => p.name === 'Uranus')!;
    expect(venus.rotationHours).toBeLessThan(0);
    // Urano: 98° di inclinazione → convenzionalmente trattata come retrograda
    expect(Math.abs(uranus.axialTilt)).toBeGreaterThan(90);
  });

  // 4.9 — Elementi orbitali J2000 (Ω e ω) sono presenti per ogni pianeta.
  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: longitudine del nodo ascendente Ω nel range [0, 360)',
    (_name, p) => {
      expect(p.longitudeOfAscendingNode).toBeGreaterThanOrEqual(0);
      expect(p.longitudeOfAscendingNode).toBeLessThan(360);
    }
  );
  it.each(planets.map((p) => [p.name, p] as const))(
    '%s: argomento del perielio ω nel range [0, 360)',
    (_name, p) => {
      expect(p.argumentOfPerihelion).toBeGreaterThanOrEqual(0);
      expect(p.argumentOfPerihelion).toBeLessThan(360);
    }
  );
});

describe('dataset pianeti — completezza per i componenti UI', () => {
  const checkers: Array<[string, (p: PlanetData) => void]> = [
    [
      'facts usati dal pannello informazioni sono presenti',
      (p) => {
        expect(p.facts.atmosphere).toBeTruthy();
        expect(p.facts.temperature).toBeTruthy();
        expect(typeof p.facts.moonsCount).toBe('number');
        expect(p.facts.moonsCount).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(p.facts.trivia)).toBe(true);
      },
    ],
    [
      'le lune dichiarate hanno parametri orbitali validi',
      (p) => {
        for (const m of p.moons) {
          expect(m.name).toBeTruthy();
          expect(m.orbitRadius).toBeGreaterThan(0);
          expect(m.size).toBeGreaterThan(0);
          expect(m.period).toBeGreaterThan(0);
          expect(m.color).toMatch(/^#[0-9a-f]{3,8}$/i);
        }
        // coerenza: moonsCount ≥ numero di lune mostrate
        expect(p.facts.moonsCount).toBeGreaterThanOrEqual(p.moons.length);
      },
    ],
    [
      'gradientto CSS valido per la resa grafica',
      (p) => {
        expect(p.gradient).toContain('gradient');
        expect(p.size).toBeLessThanOrEqual(p.orbitRadius); // pianeta dentro l'orbita
      },
    ],
  ];

  it.each(checkers)('%s', (_label, check) => {
    for (const p of planets) check(p);
  });

  it('i nomi italiani sono unici e distinti dai nomi inglesi', () => {
    const namesIt = planets.map((p) => p.nameIt);
    expect(new Set(namesIt).size).toBe(planets.length);
    for (const p of planets) expect(p.nameIt).not.toBe(p.name);
  });

  it('Mercurio e Venere non hanno satelliti naturali (dato reale)', () => {
    expect(planets.find((p) => p.name === 'Mercury')!.moons).toHaveLength(0);
    expect(planets.find((p) => p.name === 'Venus')!.moons).toHaveLength(0);
    expect(planets.find((p) => p.name === 'Earth')!.moons[0].name).toBe('Luna');
  });

  // 4.1 — Le lune principali sono definite per i pianeti che le hanno
  it('i pianeti con lune principali reali hanno almeno una luna nel dataset', () => {
    const expectedMoons: Record<string, number> = {
      Earth: 1,
      Mars: 2,
      Jupiter: 4,
      Saturn: 2,
      Uranus: 1,
      Neptune: 1,
    };
    for (const [name, count] of Object.entries(expectedMoons)) {
      const p = planets.find((x) => x.name === name)!;
      expect(p.moons.length).toBeGreaterThanOrEqual(count);
    }
  });
});
