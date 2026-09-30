import { it } from 'vitest';
import { planets } from '../data/planets';
import { meanLongitudeAt } from './kepler';
import { anglesForDate, simTimeForDate } from './simDate';
import { keplerPosition } from '../hooks/useOrbitEngine';

const earth = planets.find((p) => p.name === 'Earth')!;

it('dbg', () => {
  for (const date of [new Date(Date.UTC(2026, 8, 30, 12)), new Date(Date.UTC(2031, 5, 15, 12))]) {
    const starts = anglesForDate(planets, date);
    const t0 = simTimeForDate(earth, date, planets);
    console.log(date.toISOString().slice(0, 10), 't0=', t0);
    for (const p of planets) {
      const pos = keplerPosition(p, t0, starts[p.name]);
      const lam = meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date);
      let diff = Math.abs(pos.angle - lam) % 360;
      if (diff > 180) diff = 360 - diff;
      console.log(
        ' ',
        p.name.padEnd(8),
        'M0=',
        starts[p.name].toFixed(3).padStart(8),
        'angle=',
        pos.angle.toFixed(3).padStart(8),
        'lam=',
        lam.toFixed(3).padStart(8),
        'diff=',
        diff.toFixed(3)
      );
    }
  }
});
