import { useEffect, useMemo, useRef, useState } from 'react';
import { planets, type PlanetData } from './data/planets';
import Starfield from './components/Starfield';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import ControlsSidebar from './components/ControlsSidebar';
import Planet from './components/Planet';
import AsteroidBelt from './components/AsteroidBelt';
import CompareModal from './components/CompareModal';
import QuizModal from './components/QuizModal';
import { keplerPosition, useOrbitEngine } from './hooks/useOrbitEngine';
import { computeSystemScale } from './utils/format';
import { meanLongitudeAt } from './utils/kepler';
import { CONFIG } from './config';

const {
  stage: STAGE,
  speedOptions: SPEED_OPTIONS,
  j2000Ms: J2000_MS,
  zoomMin: ZOOM_MIN,
  zoomMax: ZOOM_MAX,
  zoomStep: ZOOM_STEP,
  wheelZoomFactor: WHEEL_ZOOM_FACTOR,
  earthYearSimSeconds: EARTH_YEAR_SIM_SECONDS,
} = CONFIG;

/** Applica un passo di zoom (positivo o negativo) restando nei limiti CONFIG. */
function zoomBy(z: number, step: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + step).toFixed(2)));
}

/** Offset angolari iniziali derivati dalle longitudini medie all'epoca J2000:
 *  la simulazione parte dalla configurazione reale dei pianeti alla data scelta. */
function anglesForDate(date: Date): Record<string, number> {
  return Object.fromEntries(
    planets.map((p) => [p.name, meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date)])
  );
}

/** Congela il tempo simulato necessario per portare i pianeti alla data scelta.
 *  Risolve M = ω + n·t rispetto a t (in giorni), poi converte in secondi di
 *  simulazione: 1 anno terrestre = CONFIG.earthYearSimSeconds (10s). */
function simTimeForDate(date: Date): number {
  const earth = planets.find((p) => p.name === 'Earth') ?? planets[2];
  const d = ((date.getTime() - J2000_MS) / 86_400_000) % earth.orbitalPeriod;
  const daysPerSecond = earth.orbitalPeriod / EARTH_YEAR_SIM_SECONDS;
  return d / daysPerSecond;
}

function useSystemScale() {
  // useState dentro un custom hook: le regole dei hooks lo richiedono
  // (react-hooks/rules-of-hooks); prima era una chiamata in un modulo outer,
  // silenziosamente illegale.
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const update = () => setScale(computeSystemScale(window.innerWidth, window.innerHeight, STAGE));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

interface AppProps {
  /** RNG del quiz, iniettabile per test deterministici (in produzione: Math.random). */
  quizRnd?: () => number;
}

export default function App({ quizRnd }: AppProps = {}) {
  // Identità stabile: QuizModal rigenera le domande se cambia `rnd`, quindi il
  // generatore iniettato va memoizzato (in produzione: Math.random, sempre lo
  // stesso riferimento).
  const stableQuizRnd = useMemo(() => quizRnd ?? Math.random, [quizRnd]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [realistic, setRealistic] = useState(true);
  const [followMode, setFollowMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [simDate, setSimDate] = useState<Date | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const baseScale = useSystemScale();
  const scale = baseScale * zoom;
  // Motore animativo requestAnimationFrame con orbite kepleriane ed eccentricità.
  // Quando si sceglie una data, gli offset angolari derivano dalle longitudini
  // medie reali (J2000) e il tempo simulato riparte dal valore che corrisponde
  // alla data: i pianeti appaiono nella configurazione del giorno scelto.
  const initialAngles = useMemo(() => (simDate ? anglesForDate(simDate) : undefined), [simDate]);
  const startSimTime = useMemo(() => (simDate ? simTimeForDate(simDate) : 0), [simDate]);
  const { positions, simTime } = useOrbitEngine(
    planets,
    isPlaying,
    speed,
    initialAngles,
    startSimTime
  );

  // Data corrente della simulazione: epoca di partenza + tempo simulato
  // (1 anno terrestre = CONFIG.earthYearSimSeconds a velocità 1x).
  const earth = planets.find((p) => p.name === 'Earth') ?? planets[2];
  const daysPerSec = earth.orbitalPeriod / EARTH_YEAR_SIM_SECONDS;
  const currentDate = useMemo(
    () => new Date((simDate ?? new Date()).getTime() + simTime * daysPerSec * 86_400_000),
    [simDate, simTime, daysPerSec]
  );

  // Modalità orbita: centra il palco sul pianeta seguito
  const followed = followMode && selectedPlanet ? positions[selectedPlanet.name] : null;
  const viewOffset = useMemo(() => {
    if (!followed) return pan;
    const rad = (followed.angle * Math.PI) / 180;
    const fx = followed.radius * Math.sin(rad);
    const fy = -followed.radius * Math.cos(rad);
    return { x: pan.x - fx, y: pan.y - fy };
  }, [followed, pan]);

  // Scorciatoie da tastiera. `speed` si legge da un ref (aggiornato a ogni
  // render) così il listener non viene ri-registrato a ogni cambio velocità:
  // i listener accumulati su window erano la causa dei doppi passi freccia.
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Non "rubare" i tasti quando il focus è su un controllo interattivo:
      // Spazio/frecce/+/- sono operativi anche per button, select e slider.
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.closest('button'))
      ) {
        return;
      }
      const idx = SPEED_OPTIONS.indexOf(speedRef.current);
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'ArrowRight':
          setSpeed(SPEED_OPTIONS[Math.min(idx + 1, SPEED_OPTIONS.length - 1)]);
          break;
        case 'ArrowLeft':
          setSpeed(SPEED_OPTIONS[Math.max(idx - 1, 0)]);
          break;
        case 'Escape':
          setSelectedPlanet(null);
          setShowCompare(false);
          setShowQuiz(false);
          break;
        case '+':
        case '=':
          setZoom((z) => zoomBy(z, ZOOM_STEP));
          break;
        case '-':
          setZoom((z) => zoomBy(z, -ZOOM_STEP));
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Zoom con rotellina del mouse sulla scena
  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z - e.deltaY * WHEEL_ZOOM_FACTOR).toFixed(3)))
    );
  };
  // Pan col trascinamento: lo stato del drag vive in un useRef, NON in una
  // variabile locale del corpo del componente (ogni frame rAF ne creava una
  // nuova, perdendo coordinate e flag `active` → pan scattoso/invertito).
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current.active = true;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.x) / scale;
    const dy = (e.clientY - dragRef.current.y) / scale;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden text-white">
      <Starfield />
      <div className="comet" aria-hidden="true" />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 bg-gradient-to-r from-[#0d1b3e]/90 to-[#1a0a3e]/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-lg font-bold tracking-wide md:text-xl">
          <span aria-hidden>🌌</span> Sistema Solare Interattivo
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="hidden items-center gap-2 text-xs text-white/60 sm:flex"
            title="Mostra le posizioni dei pianeti a una data specifica"
          >
            📅 Data
            <input
              type="date"
              value={simDate ? simDate.toISOString().slice(0, 10) : ''}
              onChange={(e) => {
                const v = e.target.value;
                setSimDate(v ? new Date(`${v}T12:00:00Z`) : null);
              }}
              className="rounded-lg border border-white/15 bg-[#141433] px-2 py-1 text-xs text-white"
            />
          </label>
          <button
            onClick={() => setShowLabels((v) => !v)}
            aria-pressed={showLabels}
            className={`chip hidden sm:block ${showLabels ? 'active' : ''}`}
            title="Mostra o nascondi i nomi dei pianeti"
          >
            Etichette
          </button>
          <button
            onClick={() => setRealistic((v) => !v)}
            aria-pressed={realistic}
            className={`chip ${realistic ? 'active' : ''}`}
            title="Texture procedurali, lune e fascia degli asteroidi"
          >
            Realismo
          </button>
          <button
            onClick={() => setShowCompare(true)}
            className="chip hidden md:block"
            title="Confronta due pianeti"
          >
            ⚖️ Confronto
          </button>
          <button
            onClick={() => setShowQuiz(true)}
            className="chip"
            title="Metti alla prova le tue conoscenze"
          >
            🧠 Quiz
          </button>
        </div>
      </header>

      {/* Contenuto principale */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        {/* Visualizzazione */}
        <main
          className="relative flex min-h-0 flex-1 cursor-grab touch-none items-center justify-center overflow-hidden active:cursor-grabbing"
          aria-label="Simulazione del sistema solare"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="relative shrink-0 transition-transform duration-200"
            style={{
              width: STAGE,
              height: STAGE,
              transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${scale})`,
            }}
          >
            {/* Sole */}
            <div className="sun" role="img" aria-label="Sole">
              <div className="sun-corona" />
              <div className="sun-flare" />
            </div>

            {/* Scie orbitali dei pianeti (selezione attiva) */}
            {planets.map((planet) => {
              const pos = positions[planet.name];
              if (!pos || (selectedPlanet?.name !== planet.name && !followMode)) return null;
              const trail = [0.12, 0.24, 0.38].map((f) =>
                keplerPosition(planet, simTime - f * speed)
              );
              return (
                <svg
                  key={`trail-${planet.name}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  width={planet.orbitRadius * 2 + 40}
                  height={planet.orbitRadius * 2 + 40}
                  viewBox={`${-(planet.orbitRadius + 20)} ${-(planet.orbitRadius + 20)} ${
                    (planet.orbitRadius + 20) * 2
                  } ${(planet.orbitRadius + 20) * 2}`}
                  aria-hidden="true"
                >
                  {trail.map((tp, i) => {
                    const r2 = (tp.angle * Math.PI) / 180;
                    return (
                      <circle
                        key={i}
                        cx={tp.radius * Math.sin(r2)}
                        cy={-tp.radius * Math.cos(r2)}
                        r={Math.max(1.5, planet.size * 0.22)}
                        fill={planet.color}
                        opacity={(0.35 - i * 0.1) * (speed >= 1 ? 1 : 0.4)}
                      />
                    );
                  })}
                </svg>
              );
            })}

            {/* Fascia degli asteroidi (tra Marte e Giove) */}
            {realistic && <AsteroidBelt simTime={simTime} />}

            {/* Orbite e pianeti */}
            {planets.map((planet) => {
              const isSelected = selectedPlanet?.name === planet.name;
              const pos = positions[planet.name] ?? { angle: 0, radius: planet.orbitRadius };
              return (
                <div
                  key={planet.name}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: planet.orbitRadius * 2, height: planet.orbitRadius * 2 }}
                >
                  {/* Traccia orbita */}
                  <div
                    className={`orbit-ring absolute inset-0 rounded-full ${isSelected ? 'selected' : ''}`}
                  />

                  {/* Pianeta (posizionato dal motore rAF kepleriano) */}
                  <Planet
                    planet={planet}
                    angle={pos.angle}
                    radius={pos.radius}
                    isSelected={isSelected}
                    showLabel={showLabels}
                    simTime={simTime}
                    realistic={realistic}
                    onSelect={setSelectedPlanet}
                  />
                </div>
              );
            })}
          </div>

          {/* Controlli vista: zoom / pan / insegue orbita */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              className="view-btn"
              aria-label="Aumenta zoom"
              title="Zoom +"
            >
              ＋
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2)))}
              className="view-btn"
              aria-label="Riduci zoom"
              title="Zoom −"
            >
              －
            </button>
            <button
              onClick={resetView}
              className="view-btn"
              aria-label="Reimposta visuale"
              title="Reimposta visuale"
            >
              ⟲
            </button>
            <button
              onClick={() => setFollowMode((v) => !v)}
              aria-pressed={followMode}
              className={`view-btn ${followMode ? 'on' : ''}`}
              title="Insegui il pianeta selezionato"
            >
              🛰
            </button>
          </div>
          {followMode && !selectedPlanet && (
            <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70">
              Seleziona un pianeta perché la camera lo insegua
            </p>
          )}

          {/* Pannello informazioni */}
          {selectedPlanet && (
            <PlanetInfoPanel planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
          )}

          {/* Annuncio per screen reader: selezione pianeta / deselezione.
              aria-live="polite" perché non deve interrompere la lettura in corso. */}
          <div role="status" aria-live="polite" className="sr-only">
            {selectedPlanet
              ? `${selectedPlanet.nameIt} selezionato. Pannello informazioni aperto.`
              : ''}
          </div>
        </main>

        {/* Sidebar controlli */}
        <ControlsSidebar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          speed={speed}
          onSpeedChange={setSpeed}
          speedOptions={SPEED_OPTIONS}
          planets={planets}
          selectedName={selectedPlanet?.name ?? null}
          onSelectPlanet={setSelectedPlanet}
          currentDate={currentDate}
        />
      </div>

      {showCompare && <CompareModal planets={planets} onClose={() => setShowCompare(false)} />}
      {showQuiz && (
        <QuizModal planets={planets} onClose={() => setShowQuiz(false)} rnd={stableQuizRnd} />
      )}
    </div>
  );
}
