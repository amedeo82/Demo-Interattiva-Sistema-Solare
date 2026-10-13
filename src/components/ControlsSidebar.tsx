import type { CSSProperties } from 'react';
import type { PlanetData } from '../data/planets';
import { useT, localeTag } from '../i18n';

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
  const t = useT();
  return (
    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto bg-[#0d0d2a]/85 p-4 pb-safe backdrop-blur-md md:w-64 lg:border-l lg:border-white/10">
      <h3 style={sectionTitle}>{t('sidebar.controls')}</h3>

      {/* Play/Pausa + scorciatoia tastiera */}
      <div>
        <button
          onClick={onTogglePlay}
          className={`btn-play w-full ${isPlaying ? 'playing' : ''}`}
          aria-pressed={!isPlaying}
        >
          <span aria-hidden>{isPlaying ? '⏸' : '▶'}</span>
          {isPlaying ? t('sidebar.pause') : t('sidebar.play')}
        </button>
        {/* Scorciatoie tastiera: sensate solo con una tastiera fisica. text-white/55
            (era /35): al limite WCAG AA sul dark theme — più leggibile per chi
            consulta la sidebar mentre esplora la demo. */}
        <p className="mt-1.5 hidden text-center text-[11px] text-white/55 md:block">
          {t('sidebar.shortcutsPrefix')} <kbd className="kbd">Spazio</kbd> {t('sidebar.kbdPause')} ·{' '}
          <kbd className="kbd">←</kbd> <kbd className="kbd">→</kbd> {t('sidebar.kbdSpeed')} ·{' '}
          <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd> {t('sidebar.kbdTilt')} · <kbd className="kbd">R</kbd>{' '}
          {t('sidebar.kbdReset')} · <kbd className="kbd">Esc</kbd> {t('sidebar.kbdClose')}
        </p>
      </div>

      {/* Velocità: preset + slider continuo */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-wider text-white/70" htmlFor="speed-slider">
          {t('sidebar.speed')} <strong className="text-white">{speed}x</strong>
        </label>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('sidebar.speedGroup')}>
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
          aria-label={t('sidebar.speedSlider')}
          title={t('sidebar.speedSliderTitle')}
        />
      </div>

      {/* Data corrente della simulazione */}
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-white/65">{t('sidebar.simDate')}</p>
        <p className="text-sm font-semibold tabular-nums text-white">
          {currentDate.toLocaleDateString(localeTag(), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Lista pianeti */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h4 className="mb-2" style={sectionTitle}>
          {t('sidebar.planets')}
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

      {/* Nota didascalica. white/75 invece di /65: al limite WCAG AA
          sul dark theme del sidebar (vedi review S15). */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-center text-xs leading-relaxed text-white/75">{t('sidebar.note')}</p>
      </div>
    </div>
  );
}
