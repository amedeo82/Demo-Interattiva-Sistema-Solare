import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { planets, type PlanetData } from './data/planets';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import ControlsSidebar from './components/ControlsSidebar';
import { IntroOverlay } from './components/IntroOverlay';
// Code-splitting: i modali (confronto/quiz) non servono al primo paint.
const CompareModal = lazy(() => import('./components/CompareModal'));
const QuizModal = lazy(() => import('./components/QuizModal'));
import { useOrbitEngine } from './hooks/useOrbitEngine';
import {
  anglesForDate,
  anomaliesForDate,
  simTimeForDate,
  currentDateForSimTime,
} from './utils/simDate';
import { usePersistentState, PREFS_KEYS } from './utils/prefs';
import { CONFIG } from './config';
import { TelemetryHUD } from './scene/TelemetryHUD';
import { HoverCrosshair } from './components/HoverCrosshair';
// Code-splitting: <SolarScene> porta dentro tutto Three.js (300KB+ gzip).
// Lazy = non viene scaricato finché non si renderizza la scena.
const SolarScene = lazy(() =>
  import('./scene/SolarScene').then((m) => ({ default: m.SolarScene }))
);

const {
  speedOptions: SPEED_OPTIONS,
  defaultSpeed: DEFAULT_SPEED,
} = CONFIG;

/** Hook che traccia la dimensione viewport (rende il layout reattivo). */
function useViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

/** Limiti di rotazione della camera 3D (gradi). TILT_YAW riservato a frecce ←/→ future. */
const TILT_PITCH_MIN = -45;
const TILT_PITCH_MAX = 25;
const TILT_YAW_MIN = -60;
const TILT_YAW_MAX = 60;
const TILT_RESET = { pitch: -10, yaw: 0 };
const clampPitch = (p: number) => Math.min(TILT_PITCH_MAX, Math.max(TILT_PITCH_MIN, p));
const clampYaw = (y: number) => Math.min(TILT_YAW_MAX, Math.max(TILT_YAW_MIN, y));
// Sopprimi il warning "unused" finché le frecce ←/→ non sono attivate.
void TILT_YAW_MIN;
void TILT_YAW_MAX;
void clampYaw;
interface AppProps {
  /** RNG del quiz, iniettabile per test deterministici (in produzione: Math.random). */
  quizRnd?: () => number;
}

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
  // S1.2 — Tilt della camera 3D: pitch (asse X) e yaw (asse Y), entrambi
  // clampati in fase di update. Partiamo con un pitch negativo per dare
  // profondità immediata ("guardiamo il sistema da sopra-davanti").
  const [tilt, setTilt] = useState({ pitch: -10, yaw: 0 });
  const [simDate, setSimDate] = useState<Date | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  // S3.3 — titolo cinematografico: mostrato al mount, auto-dismiss dopo 3s.
  const [introVisible, setIntroVisible] = useState(true);
  // S3.4 — cinematic slow-mo: quando l'utente seleziona un pianeta, la
  // simulazione rallenta a 0.25× per 2.5s per dare "peso" alla transizione
  // della camera. Ref (non state) per non causare re-render.
  const slowmoMultiplierRef = useRef(1);
  const slowmoEndRef = useRef(0);
  // S3.5 — Free camera toggle: quando ON, OrbitControls vola libero
  // (no tilt limits, no auto-setPolarAngle).
  const [freeCamera, setFreeCamera] = useState(false);
  // S3.6 — Tour guidato: quando ON, un TourController dentro la scena
  // fa partire una sequenza cinematica di fly-to.
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState<'idle' | 'overview' | 'earth' | 'saturn' | 'end'>('idle');
  // S4.2 — Refs per TelemetryHUD: aggiornati a 60Hz dentro il Canvas,
  // letti a 2Hz dal DOM HUD. Zero re-render React per il loop rAF.
  const cameraDistanceRef = useRef(100);
  const cameraPositionRef = useRef({ x: 0, y: 70, z: 100 });
  const fpsRef = useRef(0);
  // S4.3 — Hover refs: aggiornati da HoverRaycaster dentro Canvas.
  const mouseNdcRef = useRef({ x: 0, y: 0 });
  const worldHitRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const hoveredBodyRef = useRef<string | null>(null);
  // Post-processing (Bloom + Vignette): persistito come le altre preferenze.
  const [postFxEnabled, setPostFxEnabled] = usePersistentState<boolean>(
    PREFS_KEYS.postFxEnabled,
    true,
    (v) => typeof v === 'boolean'
  );
  useViewport();
  // Motore animativo requestAnimationFrame con orbite kepleriane ed eccentricità.
  // Quando si sceglie una data, offset angolari E tempo simulato di partenza
  // derivano dalla stessa anomalia media (vedi utils/simDate): la scena mostra
  // la configurazione reale dei pianeti nel giorno scelto, coerente anche per
  // epoche lontane da J2000 e per pianeti con periodi non commensurabili.
  const initialAngles = useMemo(
    () => (simDate ? anglesForDate(planets, simDate) : undefined),
    [simDate]
  );
  // Anomalie medie della data: origine dell'avanzamento kepleriano nel motore
  // (vedi keplerPosition / utils/simDate): a t₀ ν = 0 ESATTO per tutti.
  const initialAnomalies = useMemo(
    () => (simDate ? anomaliesForDate(planets, simDate) : undefined),
    [simDate]
  );
  const startSimTime = useMemo(
    () => (simDate ? simTimeForDate(earth, simDate, planets) : 0),
    [simDate]
  );
  const engine = useOrbitEngine(
    planets,
    isPlaying,
    speed,
    initialAngles,
    startSimTime,
    initialAnomalies,
    slowmoMultiplierRef
  );
  const { positionsRef, simRateRef } = engine;
  // `simTime` throttled (~4Hz): basta alla data in sidebar; NON riconduce la
  // scena a 60fps come faceva il vecchio stato del motore.
  const simTime = engine.useSimTime();

  // Data corrente della simulazione: epoca di partenza + tempo simulato
  // (1 anno terrestre = CONFIG.earthYearSimSeconds a velocità 1x).
  const currentDate = useMemo(
    () => currentDateForSimTime(earth, simDate ?? new Date(), simTime),
    [simDate, simTime]
  );

  // Tilt camera 3D: ref imperativo per evitare re-render del <SolarScene>.
  // Il tilt viene letto dentro useFrame() del CameraRig (vedi scene/CameraRig.tsx).
  const tiltRef = useRef(tilt);
  tiltRef.current = tilt;

  // Scorciatoie da tastiera. I setter di useState/usePersistentState sono
  // stabili per tutta la vita del componente, quindi il listener viene
  // registrato una sola volta e legge `speed` da un ref (aggiornato a ogni
  // render): niente ri-registrazioni a ogni cambio velocità (i listener
  // accumulati su window erano la causa dei doppi passi freccia).
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const setSpeedRef = useRef(setSpeed);
  setSpeedRef.current = setSpeed;

  // S3.4 — Auto reset del cinematic slow-mo dopo 2.5s. Il motore legge
  // `slowmoMultiplierRef.current` ad ogni frame: 0.25 durante la finestra
  // cinematica, 1 altrimenti. Loop rAF separato (setInterval a 100ms)
  // per non re-renderizzare App quando il valore cambia.
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const target = now < slowmoEndRef.current ? 0.25 : 1;
      if (slowmoMultiplierRef.current !== target) {
        slowmoMultiplierRef.current = target;
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

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
        // Nella scena 3D lo zoom è gestito da OrbitControls (rotellina).
        // Teniamo i tasti come alias del pitch: + = guarda giù (pitch +), - = guarda su (pitch -)
        case '+':
        case '=':
          setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch + 3) }));
          break;
        case '-':
          setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch - 3) }));
          break;
        // S1.2 — scorciatoie camera 3D
        case 'r':
        case 'R':
          resetView();
          break;
        case 't':
        case 'T':
          setTilt(TILT_RESET);
          break;
        case 'ArrowUp':
          setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch + 3) }));
          break;
        case 'ArrowDown':
          setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch - 3) }));
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset visuale: nella 3D OrbitControls gestisce camera + zoom + pan,
  // quindi ci limitiamo a resettare il tilt custom dell'utente.
  // Reset visuale: nella 3D OrbitControls gestisce camera + zoom + pan,
// quindi ci limitiamo a resettare il tilt custom dell'utente.
const resetView = () => {
  setTilt(TILT_RESET);
};

const handleSelectPlanet = (p: PlanetData) => {
  setSelectedPlanet(p);
  // S3.4 — attiva slow-mo cinematografico per 2.5s
  slowmoMultiplierRef.current = 0.25;
  slowmoEndRef.current = performance.now() + 2500;
};

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden text-white">
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
            onClick={() => setPostFxEnabled((v) => !v)}
            aria-pressed={postFxEnabled}
            className={`chip ${postFxEnabled ? 'active' : ''}`}
            title="Bloom (alone del Sole) e vignette cinematografica"
          >
            ✨ FX
          </button>
          <button
            onClick={() => setShowCompare(true)}
            className="chip hidden md:block"
            title="Confronta due pianeti"
          >
            ⚖️ Confronto
          </button>
          <button
            onClick={() => setTourActive((v) => !v)}
            aria-pressed={tourActive}
            className={`chip ${tourActive ? 'active' : ''}`}
            title="Tour guidato: panoramica → Terra → Saturno"
          >
            🎬 Tour
          </button>
          <button
            onClick={() => setFreeCamera((v) => !v)}
            aria-pressed={freeCamera}
            className={`chip ${freeCamera ? 'active' : ''}`}
            title="Modalità camera libera: orbita illimitata, tilt sbloccato"
          >
            🛰 Free Cam
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
        {/* Scena 3D (Three.js via react-three-fiber) */}
        <main
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          aria-label="Simulazione 3D del sistema solare"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* S4.2 — Telemetry HUD (speed, date, dist, fps) */}
          <TelemetryHUD
            speed={speed}
            currentDate={currentDate}
            cameraDistanceRef={cameraDistanceRef}
            fpsRef={fpsRef}
          />
          {/* S4.3 — Hover crosshair + coordinate readout */}
          <HoverCrosshair
            mouseNdcRef={mouseNdcRef}
            worldHitRef={worldHitRef}
            hoveredBodyRef={hoveredBodyRef}
          />

          <Suspense fallback={<div className="h-full w-full" aria-label="Caricamento scena 3D" />}>
            <SolarScene
              positionsRef={positionsRef}
              simRateRef={simRateRef}
              selectedBodyName={selectedPlanet?.name ?? null}
              onSelectBody={(name) => {
                const p = planets.find((x) => x.name === name) ?? null;
                setSelectedPlanet(p);
              }}
              postFxEnabled={postFxEnabled}
              tiltRef={tiltRef}
              onIntroComplete={() => setIntroVisible(false)}
              freeCamera={freeCamera}
              tourActive={tourActive}
              onTourStep={(step) => setTourStep(step)}
              cameraDistanceRef={cameraDistanceRef}
              cameraPositionRef={cameraPositionRef}
              fpsRef={fpsRef}
              mouseNdcRef={mouseNdcRef}
              worldHitRef={worldHitRef}
              hoveredBodyRef={hoveredBodyRef}
            />
          </Suspense>

          {/* S3.3 — Title overlay cinematografico sopra tutto */}
          {introVisible && (
            <IntroOverlay
              visibleMs={1500}
              fadeMs={1200}
              onComplete={() => setIntroVisible(false)}
            />
          )}

          {/* Overlay controlli vista in basso a sinistra: tilt + reset.
              Nella scena 3D zoom e pan sono gestiti da OrbitControls (rotellina + drag). */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch + 5) }))}
              className="view-btn"
              aria-label="Alza la camera"
              title="Camera pitch +"
            >
              ↑
            </button>
            <button
              onClick={() => setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch - 5) }))}
              className="view-btn"
              aria-label="Abbassa la camera"
              title="Camera pitch −"
            >
              ↓
            </button>
            <button
              onClick={resetView}
              className="view-btn"
              aria-label="Reimposta visuale"
              title="Reimposta visuale (R)"
            >
              ⟲
            </button>
          </div>

          {/* S3.6 — Tour in corso: overlay con step corrente */}
          {tourActive && tourStep !== 'idle' && tourStep !== 'end' && (
            <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur-sm">
              🎬 Tour ·{' '}
              {tourStep === 'overview'
                ? 'Panoramica sistema'
                : tourStep === 'earth'
                  ? 'Terra'
                  : tourStep === 'saturn'
                    ? 'Saturno'
                    : ''}
            </div>
          )}
          {tourActive && tourStep === 'end' && (
            <div className="pointer-events-auto absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm">
              Tour completato ·{' '}
              <button
                onClick={() => {
                  setTourActive(false);
                  setTourStep('idle');
                }}
                className="underline hover:text-white"
              >
                Esci
              </button>
            </div>
          )}

          {/* Pannello informazioni pianeta */}
          {selectedPlanet && (
            <PlanetInfoPanel
              planet={selectedPlanet}
              onClose={() => setSelectedPlanet(null)}
              positionsRef={positionsRef}
            />
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
          onSelectPlanet={handleSelectPlanet}
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
