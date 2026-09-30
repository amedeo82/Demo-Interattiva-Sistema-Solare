import { useEffect, useMemo, useRef, useState } from 'react';
import { planets, type PlanetData } from './data/planets';
import Starfield from './components/Starfield';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import ControlsSidebar from './components/ControlsSidebar';
import Planet from './components/Planet';
import AsteroidBelt from './components/AsteroidBelt';
import { lazy, Suspense } from 'react';
// Code-splitting: i modali (confronto/quiz) non servono al primo paint.
const CompareModal = lazy(() => import('./components/CompareModal'));
const QuizModal = lazy(() => import('./components/QuizModal'));
import { useOrbitEngine, keplerPosition } from './hooks/useOrbitEngine';
import { computeSystemScale } from './utils/format';
import { anglesForDate, simTimeForDate } from './utils/simDate';
import { usePersistentState, PREFS_KEYS } from './utils/prefs';
import { CONFIG } from './config';

const {
  stage: STAGE,
  speedOptions: SPEED_OPTIONS,
  defaultSpeed: DEFAULT_SPEED,
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

/** Limita lo zoom ai range configurati (usato da rotellina e pinch). */
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(3)));

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

// Scie orbitali: aggiornate imperativamente a ogni frame. Bug storico
// corretto: l'offset temporale dei punti era legato a `speed` (che è un
// moltiplicatore del tempo), quindi cambiando velocità la scia cambiava
// dimensione in modo contro-intuitivo. Ora l'età dei punti è una frazione
// fissa del periodo orbitale, indipendente dalla velocità di simulazione.
const TRAIL_FRACS = CONFIG.trailFractions;

/** Terra: riferimento per la scala temporale della simulazione
 *  (1 anno terrestre = CONFIG.earthYearSimSeconds secondi di sim a 1x). */
const earth = planets.find((p) => p.name === 'Earth') ?? planets[2];

export default function App({ quizRnd }: AppProps = {}) {
  // Identità stabile: QuizModal rigenera le domande se cambia `rnd`, quindi il
  // generatore iniettato va memoizzato (in produzione: Math.random, sempre lo
  // stesso riferimento).
  const stableQuizRnd = useMemo(() => quizRnd ?? Math.random, [quizRnd]);
  const [isPlaying, setIsPlaying] = useState(true);
  // Preferenze persistite: velocità, etichette e realismo sopravvivono al
  // refresh. I valori letti da localStorage sono validati (speed deve essere
  // uno degli SPEED_OPTIONS; i flag devono essere booleani).
  const [speed, setSpeed] = usePersistentState<number>(
    PREFS_KEYS.speed,
    DEFAULT_SPEED,
    (v) => typeof v === 'number' && SPEED_OPTIONS.includes(v)
  );
  const [showLabels, setShowLabels] = usePersistentState<boolean>(
    PREFS_KEYS.showLabels,
    true,
    (v) => typeof v === 'boolean'
  );
  const [realistic, setRealistic] = usePersistentState<boolean>(
    PREFS_KEYS.realistic,
    true,
    (v) => typeof v === 'boolean'
  );
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [followMode, setFollowMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [simDate, setSimDate] = useState<Date | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const baseScale = useSystemScale();
  const scale = baseScale * zoom;
  // Motore animativo requestAnimationFrame con orbite kepleriane ed eccentricità.
  // Quando si sceglie una data, offset angolari E tempo simulato di partenza
  // derivano dalla stessa anomalia media (vedi utils/simDate): la scena mostra
  // la configurazione reale dei pianeti nel giorno scelto, coerente anche per
  // epoche lontane da J2000 e per pianeti con periodi non commensurabili.
  const initialAngles = useMemo(
    () => (simDate ? anglesForDate(planets, simDate) : undefined),
    [simDate]
  );
  const startSimTime = useMemo(() => (simDate ? simTimeForDate(earth, simDate) : 0), [simDate]);
  const engine = useOrbitEngine(planets, isPlaying, speed, initialAngles, startSimTime);
  const { subscribeFrames, positionsRef } = engine;
  // `simTime` throttled (~4Hz): basta alla data in sidebar; NON riconduce la
  // scena a 60fps come faceva il vecchio stato del motore.
  const simTime = engine.useSimTime();

  // Data corrente della simulazione: epoca di partenza + tempo simulato
  // (1 anno terrestre = CONFIG.earthYearSimSeconds a velocità 1x).
  const daysPerSec = earth.orbitalPeriod / EARTH_YEAR_SIM_SECONDS;
  const currentDate = useMemo(
    () => new Date((simDate ?? new Date()).getTime() + simTime * daysPerSec * 86_400_000),
    [simDate, simTime, daysPerSec]
  );

  // Modalità orbita: centra il palco sul pianeta seguito. Il pan vive nello
  // stato React (raro), la posizione del pianeta seguito NO: per non ri-
  // innescare transizioni CSS a ogni frame, la transform del palco è scritta
  // imperativamente qui sotto (useEffect + abbonamento ai frame).
  const followedName = followMode && selectedPlanet ? selectedPlanet.name : null;
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ panX: 0, panY: 0, scale: 1 });
  viewRef.current.panX = pan.x;
  viewRef.current.panY = pan.y;
  viewRef.current.scale = scale;

  useEffect(() => {
    const writeStageTransform = () => {
      const el = stageRef.current;
      if (!el) return;
      let x = viewRef.current.panX;
      let y = viewRef.current.panY;
      if (followedName) {
        const followed = positionsRef.current[followedName];
        if (followed) {
          const rad = (followed.angle * Math.PI) / 180;
          x -= followed.radius * Math.sin(rad);
          y += followed.radius * Math.cos(rad);
        }
      }
      el.style.transform = `translate(${x}px, ${y}px) scale(${viewRef.current.scale})`;
    };
    writeStageTransform();
    if (followedName) {
      return subscribeFrames(writeStageTransform);
    }
  }, [followedName, subscribeFrames, positionsRef, scale, pan]);

  // Scorciatoie da tastiera. I setter di useState/usePersistentState sono
  // stabili per tutta la vita del componente, quindi il listener viene
  // registrato una sola volta e legge `speed` da un ref (aggiornato a ogni
  // render): niente ri-registrazioni a ogni cambio velocità (i listener
  // accumulati su window erano la causa dei doppi passi freccia).
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const setSpeedRef = useRef(setSpeed);
  setSpeedRef.current = setSpeed;

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
          setSpeedRef.current(SPEED_OPTIONS[Math.min(idx + 1, SPEED_OPTIONS.length - 1)]);
          break;
        case 'ArrowLeft':
          setSpeedRef.current(SPEED_OPTIONS[Math.max(idx - 1, 0)]);
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

  // Zoom con rotellina del mouse sulla scena. NON è possibile chiamare
  // preventDefault() dall'handler React onWheel: dal React 17 l'evento
  // `wheel` è registrato come passivo a livello di root, quindi il browser
  // lo ignora e la pagina sotto può scrollare. Il listener va agganciato
  // direttamente al <main> con { passive: false } (vedi effect qui sotto).
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      // blocca lo scroll della pagina mentre si fa zoom sulla scena
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * WHEEL_ZOOM_FACTOR));
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);

  // Pan col trascinamento e PINCH-to-zoom multitouch: i pointer attivi sono
  // tracciati in una Map (ref, mai stato React). Con due dita la distanza
  // fra i punti pilota lo zoom relativo; con una sola dito il pan.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef(0);
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const twoPointDistance = () => {
    const pts = Array.from(pointersRef.current.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      // inizia un pinch: molla il drag del singolo dito
      dragRef.current.active = false;
      pinchDistRef.current = twoPointDistance();
      return;
    }
    if (e.button !== 0 || pointersRef.current.size > 2) return;
    dragRef.current.active = true;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2 && pinchDistRef.current > 0) {
      const d = twoPointDistance();
      const factor = d / pinchDistRef.current;
      pinchDistRef.current = d;
      setZoom((z) => clampZoom(z * factor));
      return;
    }
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.x) / scaleRef.current;
    const dy = (e.clientY - dragRef.current.y) / scaleRef.current;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const endPointer = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistRef.current = 0;
    if (pointersRef.current.size === 1) {
      // rimasto un solo dito: riprende il pan dalla sua posizione corrente
      const [remaining] = Array.from(pointersRef.current.values());
      dragRef.current = { x: remaining.x, y: remaining.y, active: true };
    } else if (pointersRef.current.size === 0) {
      dragRef.current.active = false;
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Le scie si ricreano solo quando cambia l'insieme dei pianeti da tracciare.
  const trails = useMemo(() => {
    if (!selectedPlanet && !followMode) return [];
    return planets
      .filter((planet) => selectedPlanet?.name === planet.name || followMode)
      .map((planet) => ({
        planet,
        dots: TRAIL_FRACS.map((f, i) => ({
          key: i,
          r: Math.max(1.5, planet.size * 0.22),
          fill: planet.color,
          opacity: (0.35 - i * 0.1) * 0.6,
        })),
      }));
  }, [selectedPlanet, followMode]);

  const trailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (trails.length === 0) return;
    const svgByPlanet = new Map<string, SVGSVGElement>();
    for (const el of Array.from(trailsRef.current?.querySelectorAll('svg') ?? [])) {
      const svg = el as SVGSVGElement;
      const name = svg.dataset.planet;
      if (name) svgByPlanet.set(name, svg);
    }
    return subscribeFrames((positions, t) => {
      // Età dei punti in secondi di simTime: il termine `t - dt` usa il tempo
      // accumulato, non la velocità corrente → scia stabile al variare di 1x/10x.
      for (const { planet } of trails) {
        const svg = svgByPlanet.get(planet.name);
        if (!svg || !positions[planet.name]) continue;
        const dots = svg.querySelectorAll('circle');
        dots.forEach((dotEl, i) => {
          const dot = dotEl as SVGCircleElement;
          const tp = keplerPosition(planet, t - TRAIL_FRACS[i] * planet.animationDuration);
          const rad = (tp.angle * Math.PI) / 180;
          dot.setAttribute('cx', String(tp.radius * Math.sin(rad)));
          dot.setAttribute('cy', String(-tp.radius * Math.cos(rad)));
        });
      }
    });
  }, [subscribeFrames, trails]);

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
          ref={mainRef}
          className="relative flex min-h-0 flex-1 cursor-grab touch-none items-center justify-center overflow-hidden active:cursor-grabbing"
          aria-label="Simulazione del sistema solare"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
        >
          <div
            ref={stageRef}
            className="relative shrink-0"
            style={{
              width: STAGE,
              height: STAGE,
              // Posizione/scale per-frame scritti imperativamente dall'effect
              // dedicato; qui solo la transizione "dolce" su zoom/pan (che sono
              // eventi rari dell'utente). Il follow-mode disattiva la
              // transizione via classe per non fightare col loop rAF.
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transition: followedName ? 'none' : 'transform 200ms ease-out',
            }}
          >
            {/* Sole */}
            <div className="sun" role="img" aria-label="Sole">
              <div className="sun-corona" />
              <div className="sun-flare" />
            </div>

            {/* Scie orbitali dei pianeti (selezione attiva): JSX statico,
                posizioni aggiornate dal motore via ref (vedi effect trails) */}
            <div ref={trailsRef} className="contents">
              {trails.map(({ planet, dots }) => (
                <svg
                  key={`trail-${planet.name}`}
                  data-planet={planet.name}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  width={planet.orbitRadius * 2 + 40}
                  height={planet.orbitRadius * 2 + 40}
                  viewBox={`${-(planet.orbitRadius + 20)} ${-(planet.orbitRadius + 20)} ${
                    (planet.orbitRadius + 20) * 2
                  } ${(planet.orbitRadius + 20) * 2}`}
                  aria-hidden="true"
                >
                  {dots.map((d) => (
                    <circle key={d.key} cx={0} cy={0} r={d.r} fill={d.fill} opacity={d.opacity} />
                  ))}
                </svg>
              ))}
            </div>

            {/* Fascia degli asteroidi (tra Marte e Giove) */}
            {realistic && <AsteroidBelt subscribeFrames={subscribeFrames} />}

            {/* Orbite e pianeti */}
            {planets.map((planet) => {
              const isSelected = selectedPlanet?.name === planet.name;
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

                  {/* Pianeta: la posizione è scritta dal motore rAF kepleriano
                      tramite ref imperativi (nessun re-render per frame) */}
                  <Planet
                    planet={planet}
                    isSelected={isSelected}
                    showLabel={showLabels}
                    realistic={realistic}
                    onSelect={setSelectedPlanet}
                    subscribeFrames={subscribeFrames}
                  />
                </div>
              );
            })}
          </div>

          {/* Controlli vista: zoom / pan / insegue orbita */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => setZoom((z) => zoomBy(z, ZOOM_STEP))}
              className="view-btn"
              aria-label="Aumenta zoom"
              title="Zoom +"
            >
              ＋
            </button>
            <button
              onClick={() => setZoom((z) => zoomBy(z, -ZOOM_STEP))}
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

      <Suspense fallback={null}>
        {showCompare && <CompareModal planets={planets} onClose={() => setShowCompare(false)} />}
        {showQuiz && (
          <QuizModal planets={planets} onClose={() => setShowQuiz(false)} rnd={stableQuizRnd} />
        )}
      </Suspense>
    </div>
  );
}
