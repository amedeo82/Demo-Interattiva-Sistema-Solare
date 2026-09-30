/**
 * Modalità confronto: seleziona due pianeti e confrontane le caratteristiche
 * principali (diametro, distanza, periodo orbitale, lune, temperatura...).
 */
import { useState } from 'react';
import type { PlanetData } from '../data/planets';
import { formatNumber, formatOrbitalPeriod } from '../utils/format';

interface Props {
  planets: PlanetData[];
  onClose: () => void;
}

type Metric = 'diameter' | 'distanceFromSun' | 'orbitalPeriod' | 'moonsCount';

const METRICS: { key: Metric; label: string; fmt: (p: PlanetData) => string }[] = [
  { key: 'diameter', label: 'Diametro', fmt: (p) => `${formatNumber(p.diameter)} km` },
  {
    key: 'distanceFromSun',
    label: 'Distanza dal Sole',
    fmt: (p) => `${formatNumber(p.distanceFromSun)} mln km`,
  },
  { key: 'orbitalPeriod', label: 'Anno planetario', fmt: (p) => formatOrbitalPeriod(p.orbitalPeriod) },
  { key: 'moonsCount', label: 'Satelliti', fmt: (p) => `${p.facts.moonsCount}` },
];

export default function CompareModal({ planets, onClose }: Props) {
  const [aName, setAName] = useState('Earth');
  const [bName, setBName] = useState('Jupiter');
  const a = planets.find((p) => p.name === aName) ?? planets[0];
  const b = planets.find((p) => p.name === bName) ?? planets[1];

  const selector = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-xs text-white/60">
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
      aria-label="Confronto pianeti"
      onClick={onClose}
    >
      <div
        className="panel-in w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">⚖️ Confronto pianeti</h2>
          <button
            onClick={onClose}
            aria-label="Chiudi confronto"
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {selector('Pianeta A', aName, setAName)}
          {selector('Pianeta B', bName, setBName)}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/50">
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
              const av = Number(a[m.key]);
              const bv = Number(b[m.key]);
              return (
                <tr key={m.key} className="border-t border-white/10">
                  <td className="py-2 text-xs text-white/50">{m.label}</td>
                  <td className={`py-2 tabular-nums ${av >= bv ? 'text-emerald-300' : 'text-white/80'}`}>
                    {m.fmt(a)}
                  </td>
                  <td className={`py-2 tabular-nums ${bv > av ? 'text-emerald-300' : 'text-white/80'}`}>
                    {m.fmt(b)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-white/10">
              <td className="py-2 text-xs text-white/50">Rapporto dimensioni</td>
              <td colSpan={2} className="py-2 text-white/80">
                {a.diameter === b.diameter
                  ? 'Uguali'
                  : `${a.diameter > b.diameter ? a.nameIt : b.nameIt} è ${(
                      Math.max(a.diameter, b.diameter) / Math.min(a.diameter, b.diameter)
                    ).toFixed(1)}× più grande`}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-white/35">
          In verde il valore maggiore per ogni metrica.
        </p>
      </div>
    </div>
  );
}
