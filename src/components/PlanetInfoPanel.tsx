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

/** Sezione espandibile del pannello (details/summary nativi accessibili). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-white/10 py-2" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white">
        {title}
        <span className="transition-transform group-open:rotate-90 text-white/40">▸</span>
      </summary>
      <div className="mt-2 text-sm leading-relaxed text-white/75">{children}</div>
    </details>
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
        <StatRow label="Rotazione (giorno)" value={planet.facts.dayLength} />
        <StatRow label="Inclinazione assiale" value={`${planet.axialTilt}°`} />
        <StatRow label="Eccentricità orbita" value={planet.eccentricity.toFixed(4)} />
        {planet.moons.length > 0 && (
          <StatRow
            label={`Satelliti mostrati (${planet.facts.moonsCount} totali)`}
            value={planet.moons.map((m) => m.name).join(', ')}
          />
        )}
      </div>

      {/* Sezioni espandibili: atmosfera, missioni, curiosità */}
      <div className="mt-3 max-h-[42vh] overflow-y-auto pr-1">
        <Section title="Atmosfera e clima">
          <p>{planet.facts.atmosphere}</p>
          <p className="mt-1 text-white/60">🌡️ {planet.facts.temperature}</p>
        </Section>
        <Section title="Missioni spaziali">
          <ul className="list-inside list-disc space-y-0.5">
            {planet.facts.missions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Section>
        <Section title="Lo sapevi?">
          <ul className="list-inside list-disc space-y-1">
            {planet.facts.trivia.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-emerald-200/90">
            📏 {planet.facts.comparison}
          </p>
        </Section>
      </div>
    </aside>
  );
}
