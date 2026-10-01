import type { CSSProperties } from 'react';
import type { PlanetData } from '../data/planets';

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  speedOptions: number[];
  planets: PlanetData[];
  selectedName: string | null;
  onSelectPlanet: (p: PlanetData) => void;
  currentDate: Date;
}

const sectionTitle: CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

export default function ControlsSidebar({
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  speedOptions,
  planets,
  selectedName,
  onSelectPlanet,
  currentDate,
}: Props) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto bg-[#0d0d2a]/85 p-4 backdrop-blur-md md:w-64 lg:border-l lg:border-white/10">
      <h3 style={sectionTitle}>Controlli</h3>

      {/* Play/Pausa + scorciatoia tastiera */}
      <div>
        <button
          onClick={onTogglePlay}
          className={`btn-play w-full ${isPlaying ? 'playing' : ''}`}
          aria-pressed={!isPlaying}
        >
          <span aria-hidden>{isPlaying ? '⏸' : '▶'}</span>
          {isPlaying ? 'Pausa' : 'Riproduci'}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-white/35">
          Scorciatoie: <kbd className="kbd">Spazio</kbd> pausa · <kbd className="kbd">←</kbd>{' '}
          <kbd className="kbd">→</kbd> velocità · <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd> tilt · <kbd className="kbd">R</kbd> reset ·{' '}
          <kbd className="kbd">Esc</kbd> chiudi
        </p>
      </div>

      {/* Velocità: preset + slider continuo */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-white/70" htmlFor="speed-slider">
          Velocità: <strong className="text-white">{speed}x</strong>
        </label>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Velocità simulazione">
          {speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              aria-pressed={speed === s}
              className={`chip ${speed === s ? 'active' : ''}`}
            >
              {s}x
            </button>
          ))}
        </div>
        <input
          id="speed-slider"
          type="range"
          min={0.1}
          max={20}
          step={0.1}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="speed-slider"
          aria-label="Regolazione continua della velocità di simulazione"
          title="Trascina per una velocità personalizzata (0,1x – 20x)"
        />
      </div>

      {/* Data corrente della simulazione */}
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Data simulazione</p>
        <p className="text-sm font-semibold tabular-nums text-white">
          {currentDate.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Lista pianeti */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h4 className="mb-2" style={sectionTitle}>
          Pianeti
        </h4>
        {planets.map((planet) => {
          const active = selectedName === planet.name;
          return (
            <button
              key={planet.name}
              onClick={() => onSelectPlanet(planet)}
              aria-pressed={active}
              className={`planet-row mb-1 ${active ? 'active' : ''}`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{
                  background: planet.gradient,
                  boxShadow: `0 0 8px ${planet.color}66`,
                }}
              />
              <span className="flex-1 text-left">{planet.nameIt}</span>
              <span className="text-white/30" aria-hidden="true">
                {planet.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {/* Nota didascalica */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-center text-xs leading-relaxed text-white/40">
          Le orbite non sono in scala. Dimensioni e distanze sono rappresentate schematicamente.
        </p>
      </div>
    </div>
  );
}
