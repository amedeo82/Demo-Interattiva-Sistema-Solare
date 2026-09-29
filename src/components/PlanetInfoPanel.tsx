import { useEffect, useRef } from 'react';
import type { PlanetData } from '../data/planets';
import { formatNumber, formatOrbitalPeriod } from '../utils/format';

interface Props {
  planet: PlanetData;
  onClose: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="text-white text-sm font-medium text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function PlanetInfoPanel({ planet, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Accessibilità: focus iniziale sul pulsante di chiusura del dialog
  useEffect(() => {
    closeRef.current?.focus();
  }, [planet.name]);

  const periodLabel = formatOrbitalPeriod(planet.orbitalPeriod);

  return (
    <aside
      className="panel-in absolute top-4 right-4 z-[100] w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl p-5"
      role="dialog"
      aria-label={`Informazioni su ${planet.nameIt}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold leading-tight">{planet.nameIt}</h2>
          <p className="text-white/40 text-xs mt-0.5 uppercase tracking-widest">{planet.name}</p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Chiudi pannello"
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
        >
          ✕
        </button>
      </div>

      {/* Anteprima pianeta */}
      <div className="my-5 flex justify-center">
        <div
          className="relative h-16 w-16 rounded-full"
          style={{
            background: planet.gradient,
            boxShadow: `0 0 32px ${planet.color}55, inset -8px -8px 16px rgba(0,0,0,0.45)`,
          }}
        >
          {planet.name === 'Saturn' && (
            <div
              className="absolute left-1/2 top-1/2 h-7 w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border-2 pointer-events-none"
              style={{ borderColor: 'rgba(232, 208, 136, 0.55)' }}
            />
          )}
        </div>
      </div>

      <p className="mb-4 text-sm italic leading-relaxed text-white/70">{planet.description}</p>

      <div className="flex flex-col">
        <StatRow label="Diametro" value={`${formatNumber(planet.diameter)} km`} />
        <StatRow
          label="Distanza dal Sole"
          value={`${formatNumber(planet.distanceFromSun)} mln km`}
        />
        <StatRow label="Periodo orbitale" value={periodLabel} />
      </div>
    </aside>
  );
}
