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
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

// La sidebar è un flex-col figlio della #controls-sheet (a sua volta flex-col
// con altezza vincolata). `min-h-0` + `flex-1` la fanno riempire l'altezza
// disponibile; `overflow-y-auto` + `min-h-0` permettono alla lista pianeti
// interna di scrollare quando i contenuti superano l'altezza. La nota
// didascalica è shrink-0 così resta sempre visibile in fondo.
const sectionPanel: CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
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
    <div className="flex w-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#0d0d2a]/85 p-3 backdrop-blur-md md:w-64 lg:border-l lg:border-white/10">
      <h3 style={sectionTitle}>{t('sidebar.controls')}</h3>

      {/* Play / Pausa */}
      <button
        onClick={onTogglePlay}
        className={`btn-play w-full ${isPlaying ? 'playing' : ''}`}
        aria-pressed={!isPlaying}
        aria-label={isPlaying ? t('sidebar.pause') : t('sidebar.play')}
      >
        <span aria-hidden>{isPlaying ? '⏸' : '▶'}</span>
        {isPlaying ? t('sidebar.pause') : t('sidebar.play')}
      </button>

      {/* Velocità: preset + slider continuo */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11px] uppercase tracking-wider text-white/70"
          htmlFor="speed-slider"
        >
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
      <div style={sectionPanel} className="px-3 py-1.5">
        <p className="text-[10px] uppercase tracking-wider text-white/65">{t('sidebar.simDate')}</p>
        <p className="text-[13px] font-semibold leading-snug tabular-nums text-white">
          {currentDate.toLocaleDateString(localeTag(), {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Lista pianeti — flex-1 con scroll interno per i display bassi.
          `min-h-[140px]` garantisce almeno 4 pianeti visibili anche
          su mobile (iphone-se 375×667 ha ~410px di sidebar height:
          senza min-h il flex-1 collassa a ~15px e la lista è inutilizzabile). */}
      <div className="min-h-[140px] flex-1 overflow-y-auto pr-1">
        <h4 className="mb-1.5" style={sectionTitle}>
          {t('sidebar.planets')}
        </h4>
        {planets.map((planet) => {
          const active = selectedName === planet.name;
          return (
            <button
              key={planet.name}
              onClick={() => onSelectPlanet(planet)}
              aria-pressed={active}
              className={`planet-row mb-0.5 ${active ? 'active' : ''}`}
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

      {/* Scorciatoie tastiera: <details> collassato per non occupare spazio.
          Resta accessibile alla tastiera e agli screen reader, ma il layout
          della sidebar non ne è dominato. `group-open:rotate-180` ruota la
          chevron per indicare lo stato espanso. */}
      <details className="sidebar-details group rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white/65 transition-colors hover:border-white/20">
        <summary className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center font-medium uppercase tracking-wider hover:bg-white/5 hover:text-white/85">
          <span aria-hidden>⌨</span>
          <span>{t('sidebar.shortcutsLabel')}</span>
          <span aria-hidden className="text-[9px] transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <p className="mt-1 px-1 text-center leading-relaxed text-white/60">
          <kbd className="kbd">Spazio</kbd> {t('sidebar.kbdPause')} · <kbd className="kbd">←</kbd>{' '}
          <kbd className="kbd">→</kbd> {t('sidebar.kbdSpeed')} · <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd> {t('sidebar.kbdTilt')} · <kbd className="kbd">R</kbd>{' '}
          {t('sidebar.kbdReset')} · <kbd className="kbd">Esc</kbd> {t('sidebar.kbdClose')}
        </p>
      </details>

      {/* Nota didascalica. Sempre visibile in fondo (shrink-0): la
          compressione del layout precedente la relegava sotto il fold. */}
      <div className="shrink-0 border-t border-white/10 pt-2">
        <p className="text-center text-[10.5px] leading-snug text-white/75">{t('sidebar.note')}</p>
      </div>
    </div>
  );
}
