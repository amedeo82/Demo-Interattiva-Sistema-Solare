/**
 * Modalità confronto: seleziona due pianeti e confrontane le caratteristiche
 * principali (diametro, distanza, periodo orbitale, lune, temperatura...).
 *
 * S14 · F11 — evoluzione: barre animate in scala logaritmica, nuove righe
 * (gravità, velocità orbitale media, giorno siderale) derivate dal dataset.
 */
import { useState } from 'react';
import { useT } from '../i18n';
import type { PlanetData } from '../data/planets';
import { formatNumber, formatOrbitalPeriod } from '../utils/format';
import { logScale, meanOrbitalVelocity } from '../utils/logScale';

interface Props {
  planets: PlanetData[];
  onClose: () => void;
}

const METRICS: {
  key: string;
  label: string;
  value: (p: PlanetData) => number;
  fmt: (p: PlanetData) => string;
}[] = [
  {
    key: 'diameter',
    label: 'compare.mDiameter',
    value: (p) => p.diameter,
    fmt: (p) => `${formatNumber(p.diameter)} km`,
  },
  {
    key: 'distanceFromSun',
    label: 'compare.mDistance',
    value: (p) => p.distanceFromSun,
    fmt: (p) => `${formatNumber(p.distanceFromSun)} mln km`,
  },
  {
    key: 'orbitalPeriod',
    label: 'compare.mPeriod',
    value: (p) => p.orbitalPeriod,
    fmt: (p) => formatOrbitalPeriod(p.orbitalPeriod),
  },
  {
    key: 'gravity',
    label: 'compare.mGravity',
    value: (p) => p.gravity ?? 0,
    fmt: (p) => (p.gravity != null ? `${p.gravity.toFixed(2)} m/s²` : 'n/d'),
  },
  {
    key: 'orbitalVelocity',
    label: 'compare.mVelocity',
    value: (p) => meanOrbitalVelocity(p.distanceFromSun),
    fmt: (p) => `${meanOrbitalVelocity(p.distanceFromSun).toFixed(1)} km/s`,
  },
  {
    key: 'moonsCount',
    label: 'compare.mMoons',
    value: (p) => p.facts.moonsCount,
    fmt: (p) => `${p.facts.moonsCount}`,
  },
];

/** Barra proporzionale animata (scala logaritmica sul range della metrica). */
function MetricBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(2, ratio * 100)}%`, background: color, opacity: 0.75 }}
      />
    </div>
  );
}

export default function CompareModal({ planets, onClose }: Props) {
  const t = useT();
  const [aName, setAName] = useState('Earth');
  const [bName, setBName] = useState('Jupiter');
  const a = planets.find((p) => p.name === aName) ?? planets[0];
  const b = planets.find((p) => p.name === bName) ?? planets[1];

  const selector = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-xs text-white/75">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/15 bg-[#141433] px-2 py-1.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
      >
        {planets.map((p) => (
          <option key={p.name} value={p.name}>
            {p.nameIt}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('compare.title')}
      onClick={onClose}
    >
      <div
        className="panel-in w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">{t('compare.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('compare.close')}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {selector(t('compare.planetA'), aName, setAName)}
          {selector(t('compare.planetB'), bName, setBName)}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th className="py-1 font-medium"></th>
              {[a, b].map((p) => (
                <th key={p.name} className="py-1 font-semibold text-white">
                  <span
                    className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle"
                    style={{ background: p.color }}
                  />
                  {p.nameIt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const av = m.value(a);
              const bv = m.value(b);
              const min = Math.min(av, bv);
              const max = Math.max(av, bv);
              return (
                <tr key={m.key} className="border-t border-white/10">
                  <td className="py-2 text-xs text-white/70">{t(m.label)}</td>
                  <td
                    className={`py-2 tabular-nums ${av >= bv ? 'text-emerald-300' : 'text-white/80'}`}
                  >
                    {m.fmt(a)}
                    <MetricBar ratio={logScale(av, min, max)} color={a.color} />
                  </td>
                  <td
                    className={`py-2 tabular-nums ${bv > av ? 'text-emerald-300' : 'text-white/80'}`}
                  >
                    {m.fmt(b)}
                    <MetricBar ratio={logScale(bv, min, max)} color={b.color} />
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-white/10">
              <td className="py-2 text-xs text-white/70">{t('compare.ratio')}</td>
              <td colSpan={2} className="py-2 text-white/80">
                {a.diameter === b.diameter
                  ? t('compare.equal')
                  : `${a.diameter > b.diameter ? a.nameIt : b.nameIt} ${t('compare.bigger', {
                      times: (
                        Math.max(a.diameter, b.diameter) / Math.min(a.diameter, b.diameter)
                      ).toFixed(1),
                    })}`}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-white/35">{t('compare.note')}</p>
      </div>
    </div>
  );
}
