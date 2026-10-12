import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { planets, type PlanetData } from './data/planets';
import {
  createHashWriter,
  parseDeepLink,
  type DeepLinkState,
  type DeepLinkToggle,
} from './utils/deepLink';
import PlanetInfoPanel from './components/PlanetInfoPanel';
import ControlsSidebar from './components/ControlsSidebar';
import { IntroOverlay } from './components/IntroOverlay';
import Timeline from './components/Timeline';
import { OnboardingTip } from './components/OnboardingTip';
import { ConjunctionBanner } from './components/ConjunctionBanner';
import AmbientAudio from './components/AmbientAudio';
import { SceneErrorBoundary } from './components/SceneErrorBoundary';
// Code-splitting: i modali (confronto/quiz) non servono al primo paint.
const CompareModal = lazy(() => import('./components/CompareModal'));
const QuizModal = lazy(() => import('./components/QuizModal'));
const EventsModal = lazy(() =>
  import('./components/EventsModal').then((m) => ({ default: m.EventsModal }))
);
const SkyViewModal = lazy(() =>
  import('./components/SkyViewModal').then((m) => ({ default: m.SkyViewModal }))
);
// S14 · F9 — palette sincrona: è keyboard-first (Ctrl+K deve aprirla
// immediatamente) e piccola (~5KB); il lazy complicherebbe i test fake-timer.
import { CommandPalette, type PaletteCommand } from './components/CommandPalette';
import { useT, toggleLocale } from './i18n';
import { useOrbitEngine } from './hooks/useOrbitEngine';
import { useIsMobile } from './hooks/useMedia';
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

const { speedOptions: SPEED_OPTIONS, defaultSpeed: DEFAULT_SPEED } = CONFIG;

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
  // S15 · M7 — traduttore reattivo: i componenti che lo usano si
  // ri-renderizzano al cambio lingua (chip 🌐 in header).
  const t = useT();
  const [showCompare, setShowCompare] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showSky, setShowSky] = useState(false);
  // S14 · F8 — quiz in modalità focus su un pianeta (dal pannello info)
  const [quizFocus, setQuizFocus] = useState<string | null>(null);
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
  const [tourStep, setTourStep] = useState<'idle' | 'overview' | 'earth' | 'saturn' | 'end'>(
    'idle'
  );
  // Timeline: pausa automatica durante il drag per evitare che il motore
  // "scappi" dalla posizione scelta. Stato locale (non persistito).
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  // S4.2 — Refs per TelemetryHUD: aggiornati a 60Hz dentro il Canvas,
  // letti a 2Hz dal DOM HUD. Zero re-render React per il loop rAF.
  const cameraDistanceRef = useRef(100);
  const cameraPositionRef = useRef({ x: 0, y: 70, z: 100 });
  const fpsRef = useRef(0);
  // S4.3 — Hover refs: aggiornati da HoverRaycaster dentro Canvas.
  const mouseNdcRef = useRef({ x: 0, y: 0 });
  const worldHitRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const hoveredBodyRef = useRef<string | null>(null);
  // Mobile/tablet (< 1024px): header compatto, controlli in bottom sheet,
  // pannello info a tutta larghezza, performance GPU ridotte (dpr/ particelle).
  const isMobile = useIsMobile();
  // Sheet controlli mobile: chiuso di default; si apre col FAB "☰ Controlli".
  const [controlsSheetOpen, setControlsSheetOpen] = useState(false);
  // Post-processing (Bloom + Vignette): persistito come le altre preferenze.
  // Su mobile il default al primo avvio è OFF (il bloom è il pass più costoso
  // su GPU integrate di smartphone); la preferenza dell'utente ha sempre la
  // precedenza.
  const [postFxEnabled, setPostFxEnabled] = usePersistentState<boolean>(
    PREFS_KEYS.postFxEnabled,
    !isMobile,
    (v) => typeof v === 'boolean'
  );
  // Modalità "scala reale": persistita. L'effetto 3D vero (distanze 1:1)
  // è wired in Bodies.tsx via prop; qui esponiamo solo lo stato e il chip.
  const [realScale, setRealScale] = usePersistentState<boolean>(
    PREFS_KEYS.realScale,
    false,
    (v) => typeof v === 'boolean'
  );
  // 4.5 — Ombre/eclissi: shadow map con costo GPU, default off
  const [eclipsesEnabled, setEclipsesEnabled] = usePersistentState<boolean>(
    PREFS_KEYS.eclipsesEnabled,
    false,
    (v) => typeof v === 'boolean'
  );
  // 4.11 — Screenshot: flag flash sullo schermo dopo lo scatto.
  const [screenshotFlash, setScreenshotFlash] = useState(false);
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
    isPlaying && !isDraggingTimeline,
    speed,
    initialAngles,
    startSimTime,
    initialAnomalies,
    slowmoMultiplierRef
  );
  const { positionsRef, simRateRef, simTimeRef, seekTo } = engine;
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

  // S11 · F1 — Deep link: al mount, applica lo stato dall'hash (one-shot,
  // NON viene salvato in prefs). Poi un writer debounced aggiorna l'hash
  // quando cambiano i valori. NB: l'hash ha precedenza SOLO al primo render;
  //   le modifiche utente successive scrivono l'hash e NON sovrascrivono prefs.
  useEffect(() => {
    const parsed = parseDeepLink(window.location.hash);
    if (parsed.planetKey) {
      const p = planets.find((x) => x.name === parsed.planetKey) ?? null;
      if (p) setSelectedPlanet(p);
    }
    if (parsed.speed != null) {
      setSpeedRef.current(parsed.speed);
    }
    if (parsed.toggles.size > 0) {
      if (parsed.toggles.has('labels' as DeepLinkToggle)) setShowLabels(true);
      if (parsed.toggles.has('realism' as DeepLinkToggle)) setRealistic(true);
      if (parsed.toggles.has('eclipses' as DeepLinkToggle)) setEclipsesEnabled(true);
      if (parsed.toggles.has('realscale' as DeepLinkToggle)) setRealScale(true);
      if (parsed.toggles.has('fx' as DeepLinkToggle)) setPostFxEnabled(true);
    }
    if (parsed.date) {
      // S11 · F1 — la data viene applicata via stato `simDate`: i memo
      // anglesForDate/anomaliesForDate/simTimeForDate (righe ~160-175) già
      // guidano il motore in modo dichiarativo, come il date picker.
      setSimDate(new Date(parsed.date));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Writer debounced per l'hash
  const pushHash = useMemo(() => createHashWriter(300), []);
  useEffect(() => {
    const toggles = new Set<DeepLinkToggle>();
    if (showLabels) toggles.add('labels');
    if (realistic) toggles.add('realism');
    if (eclipsesEnabled) toggles.add('eclipses');
    if (realScale) toggles.add('realscale');
    if (postFxEnabled) toggles.add('fx');
    const state: DeepLinkState = {
      planetKey: selectedPlanet?.name ?? null,
      date: null, // la data è gestita dal date picker; non la scriviamo
      speed,
      toggles,
    };
    pushHash(state);
  }, [
    selectedPlanet,
    speed,
    showLabels,
    realistic,
    eclipsesEnabled,
    realScale,
    postFxEnabled,
    pushHash,
  ]);

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
          setShowEvents(false);
          setShowSky(false);
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

  // S14 · F9 — Command palette: Ctrl/Cmd+K apre/chiude. Effect separato con
  // setter funzionale (nessuna closure stale); gli input di testo non
  // declenchano le scorciatoie globali (il gestore sopra ignora input/textarea).
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset visuale: nella 3D OrbitControls gestisce camera + zoom + pan,
  // quindi ci limitiamo a resettare il tilt custom dell'utente.
  const resetView = () => {
    setTilt(TILT_RESET);
  };

  // Torna a "oggi": annulla la data scelta, lasciando la simulazione al presente.
  const goToToday = () => setSimDate(null);

  const handleSelectPlanet = (p: PlanetData) => {
    setSelectedPlanet(p);
    // S3.4 — attiva slow-mo cinematografico per 2.5s
    slowmoMultiplierRef.current = 0.25;
    slowmoEndRef.current = performance.now() + 2500;
  };

  // 4.11 — Screenshot: cattura il canvas WebGL e lo scarica. Su mobile con
  // Web Share API, apre direttamente il pannello di condivisione.
  const takeScreenshot = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    // Forza un render frame per essere sicuri che il buffer sia aggiornato.
    // (r3f è in continuous render, ma dopo `preserveDrawingBuffer=false`
    // il toDataURL potrebbe restituire uno schermo vuoto. Settiamolo
    // esplicitamente sul canvas in produzione se necessario.)
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
      // WebGL context perse: skip silenzioso.
      console.warn('[screenshot] toDataURL fallita', err);
      return;
    }
    // Flash overlay per feedback visivo
    setScreenshotFlash(true);
    setTimeout(() => setScreenshotFlash(false), 200);
    // Mobile: Web Share API con file immagine
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `solar-system-${Date.now()}.png`, { type: 'image/png' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sistema Solare Interattivo' });
        return;
      } catch {
        // user annullato o share fallito: fallback download
      }
    }
    // Desktop fallback: download diretto
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `solar-system-${Date.now()}.png`;
    a.click();
  }, []);

  // S14 · F9 — comandi della palette (pianeti, viste, toggle, azioni).
  // S15 · M7 — label via t(): il memo dipende da `t` (cambia col locale).
  const paletteCommands = useMemo(() => {
    type W = Window & { __toggleAmbient?: () => void };
    const cmds: PaletteCommand[] = [
      ...planets.map((p) => ({
        id: `planet-${p.name}`,
        label: p.nameIt,
        hint: t('palette.hintPlanet'),
        icon: '🪐',
        run: () => handleSelectPlanet(p),
      })),
      {
        id: 'today',
        label: t('cmd.today'),
        hint: t('palette.hintTime'),
        icon: '📍',
        run: () => goToToday(),
      },
      {
        id: 'play',
        label: isPlaying ? t('cmd.pause') : t('cmd.play'),
        hint: t('palette.hintTime'),
        icon: isPlaying ? '⏸' : '▶',
        run: () => setIsPlaying((v) => !v),
      },
      {
        id: 'compare',
        label: t('cmd.compare'),
        hint: t('palette.hintView'),
        icon: '⚖️',
        run: () => setShowCompare(true),
      },
      {
        id: 'quiz',
        label: t('cmd.quiz'),
        hint: t('palette.hintView'),
        icon: '🧠',
        run: () => setShowQuiz(true),
      },
      {
        id: 'events',
        label: t('cmd.events'),
        hint: t('palette.hintView'),
        icon: '☄️',
        run: () => setShowEvents(true),
      },
      {
        id: 'sky',
        label: t('cmd.sky'),
        hint: t('palette.hintView'),
        icon: '🌍',
        run: () => setShowSky(true),
      },
      {
        id: 'screenshot',
        label: t('cmd.screenshot'),
        hint: t('palette.hintAction'),
        icon: '📷',
        run: () => void takeScreenshot(),
      },
      {
        id: 'tour',
        label: tourActive ? t('cmd.tourStop') : t('cmd.tourStart'),
        hint: t('palette.hintAction'),
        icon: '🎬',
        run: () => setTourActive((v) => !v),
      },
      {
        id: 'freecam',
        label: freeCamera ? t('cmd.freecamOff') : t('cmd.freecamOn'),
        hint: t('palette.hintCamera'),
        icon: '🎥',
        run: () => setFreeCamera((v) => !v),
      },
      {
        id: 'labels',
        label: showLabels ? t('cmd.labelsHide') : t('cmd.labelsShow'),
        hint: t('palette.hintToggle'),
        icon: '🏷️',
        run: () => setShowLabels((v) => !v),
      },
      {
        id: 'realism',
        label: realistic ? t('cmd.realismOff') : t('cmd.realismOn'),
        hint: t('palette.hintToggle'),
        icon: '🪐',
        run: () => setRealistic((v) => !v),
      },
      {
        id: 'eclipses',
        label: eclipsesEnabled ? t('cmd.eclipsesOff') : t('cmd.eclipsesOn'),
        hint: t('palette.hintToggle'),
        icon: '🌑',
        run: () => setEclipsesEnabled((v) => !v),
      },
      {
        id: 'realscale',
        label: realScale ? t('cmd.logscale') : t('cmd.realscale'),
        hint: t('palette.hintToggle'),
        icon: '📏',
        run: () => setRealScale((v) => !v),
      },
      {
        id: 'fx',
        label: postFxEnabled ? t('cmd.fxOff') : t('cmd.fxOn'),
        hint: t('palette.hintToggle'),
        icon: '✨',
        run: () => setPostFxEnabled((v) => !v),
      },
      {
        id: 'ambient',
        label: t('cmd.ambient'),
        hint: t('palette.hintToggle'),
        icon: '🎵',
        run: () => (window as W).__toggleAmbient?.(),
      },
      // palette stessa: chiude (Ctrl+K toggle)
      {
        id: 'palette',
        label: t('cmd.paletteClose'),
        hint: t('palette.hintAction'),
        icon: '⌘',
        run: () => setPaletteOpen(false),
      },
    ];
    return cmds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    t,
    isPlaying,
    tourActive,
    freeCamera,
    showLabels,
    realistic,
    eclipsesEnabled,
    realScale,
    postFxEnabled,
    takeScreenshot,
  ]);

  // Tasto S per screenshot + shortcut hint in header
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.closest('button'))
      ) {
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        void takeScreenshot();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [takeScreenshot]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden text-white">
      <AmbientAudio />
      {/* Header */}
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 bg-gradient-to-r from-[#0d1b3e]/90 to-[#1a0a3e]/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-lg font-bold tracking-wide md:text-xl">
          <span aria-hidden>🌌</span> Sistema Solare Interattivo
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="hidden items-center gap-2 text-xs text-white/75 lg:flex"
            title={t('tip.date')}
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
          {simDate && (
            <button onClick={goToToday} className="chip" title={t('tip.today')}>
              {t('chip.today')}
            </button>
          )}
          <button
            onClick={() => setShowLabels((v) => !v)}
            aria-pressed={showLabels}
            className={`chip hidden sm:block ${showLabels ? 'active' : ''}`}
            title={t('tip.labels')}
          >
            {t('chip.labels')}
          </button>
          <button
            onClick={() => setRealistic((v) => !v)}
            aria-pressed={realistic}
            className={`chip hidden sm:block ${realistic ? 'active' : ''}`}
            title={t('tip.realism')}
          >
            {t('chip.realism')}
          </button>
          <button
            onClick={() => setEclipsesEnabled((v) => !v)}
            aria-pressed={eclipsesEnabled}
            className={`chip hidden sm:block ${eclipsesEnabled ? 'active' : ''}`}
            title={t('tip.eclipses')}
          >
            🌑 {t('chip.eclipses')}
          </button>
          <button
            onClick={() => setRealScale((v) => !v)}
            aria-pressed={realScale}
            className={`chip hidden sm:block ${realScale ? 'active' : ''}`}
            title={t('tip.realscale')}
          >
            📏 {t('chip.realscale')}
          </button>
          <button
            onClick={() => setPostFxEnabled((v) => !v)}
            aria-pressed={postFxEnabled}
            className={`chip hidden sm:block ${postFxEnabled ? 'active' : ''}`}
            title={t('tip.fx')}
          >
            ✨ {t('chip.fx')}
          </button>
          <button
            className="chip hidden sm:block"
            onClick={() => void takeScreenshot()}
            title={t('tip.photo')}
          >
            {t('chip.photo')}
          </button>
          <button
            type="button"
            onClick={() => setShowEvents(true)}
            className="chip"
            aria-pressed={showEvents}
            title={t('tip.events')}
          >
            {t('chip.events')}
          </button>
          <button
            type="button"
            onClick={() => setShowSky(true)}
            className="chip"
            aria-pressed={showSky}
            title={t('tip.sky')}
          >
            {t('chip.sky')}
          </button>
          <button onClick={() => setShowQuiz(true)} className="chip" title={t('tip.quiz')}>
            {t('chip.quiz')}
          </button>
          {/* S15 · M7 — chip lingua (toggle it/en, persistito) */}
          <button
            type="button"
            onClick={toggleLocale}
            className="chip"
            aria-label={t('tip.lang')}
            title={t('tip.lang')}
          >
            {t('chip.lang')}
          </button>
          {/* Menu overflow "⋯" — visibile solo quando i chip principali non
              entrano nell'header. Su desktop mostra Confronto/Tour/Free Cam;
              su mobile raccoglie anche i toggle nascosti dall'header stretto. */}
          <OverflowMenu
            items={[
              ...(isMobile
                ? [
                    {
                      key: 'labels',
                      label: `🏷 ${t('chip.labels')}`,
                      title: t('tip.labels'),
                      active: showLabels,
                      onClick: () => setShowLabels((v) => !v),
                    },
                    {
                      key: 'realistic',
                      label: `🌍 ${t('chip.realism')}`,
                      title: t('tip.realism'),
                      active: realistic,
                      onClick: () => setRealistic((v) => !v),
                    },
                    {
                      key: 'realscale',
                      label: `📏 ${t('chip.realscale')}`,
                      title: 'Scala 1:1 (i pianeti interni diventano quasi invisibili)',
                      active: realScale,
                      onClick: () => setRealScale((v) => !v),
                    },
                    {
                      key: 'postfx',
                      label: `✨ ${t('chip.fx')}`,
                      title: t('tip.fx'),
                      active: postFxEnabled,
                      onClick: () => setPostFxEnabled((v) => !v),
                    },
                    {
                      key: 'eclipses',
                      label: `🌑 ${t('chip.eclipses')}`,
                      title: t('tip.eclipseShort'),
                      active: eclipsesEnabled,
                      onClick: () => setEclipsesEnabled((v) => !v),
                    },
                  ]
                : []),
              {
                key: 'compare',
                label: `⚖️ ${t('cmd.compareShort')}`,
                title: t('tip.compare'),
                onClick: () => setShowCompare(true),
              },
              {
                key: 'tour',
                label: '🎬 Tour',
                title: t('tip.tour'),
                active: tourActive,
                onClick: () => setTourActive((v) => !v),
              },
              {
                key: 'freecam',
                label: '🛰 Free Cam',
                title: t('tip.freecam'),
                active: freeCamera,
                onClick: () => setFreeCamera((v) => !v),
              },
            ]}
          />
          <button
            data-chip="ambient"
            onClick={() => {
              type W = Window & { __toggleAmbient?: () => void };
              (window as W).__toggleAmbient?.();
            }}
            className="chip hidden sm:block"
            title={t('tip.audio')}
          >
            🔊 {t('chip.audio')}
          </button>
        </div>
      </header>

      {/* Timeline interattiva: scrubbing avanti/indietro nel tempo di
          simulazione. Posizionata tra header e contenuto per restare
          sempre visibile. */}
      <div className="relative z-10 shrink-0 px-3 pt-2">
        <Timeline
          baseSimTime={startSimTime}
          currentSimTime={simTime}
          yearSimSeconds={CONFIG.earthYearSimSeconds}
          onSeek={seekTo}
          onDragChange={setIsDraggingTimeline}
        />
      </div>

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
          {/* Banner congiunzioni */}
          <ConjunctionBanner />
          {/* Disclaimer scala reale */}
          {realScale && (
            <div
              className="pointer-events-none absolute left-1/2 bottom-24 z-20 -translate-x-1/2 max-w-md rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-center text-[11px] text-amber-200 backdrop-blur-sm"
              role="status"
            >
              ⚠️ Scala reale: i pianeti interni sono punti quasi invisibili. Usa lo zoom per
              esplorare.
            </div>
          )}

          <SceneErrorBoundary>
            <Suspense
              fallback={
                <div className="h-full w-full" role="status" aria-label="Caricamento scena 3D" />
              }
            >
              <SolarScene
                positionsRef={positionsRef}
                simRateRef={simRateRef}
                simTimeRef={simTimeRef}
                selectedBodyName={selectedPlanet?.name ?? null}
                onSelectBody={(name) => {
                  const p = planets.find((x) => x.name === name) ?? null;
                  setSelectedPlanet(p);
                }}
                postFxEnabled={postFxEnabled}
                realistic={realistic}
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
                mobile={isMobile}
                realScale={realScale}
                eclipsesEnabled={eclipsesEnabled}
              />
            </Suspense>
          </SceneErrorBoundary>

          {/* S3.3 — Title overlay cinematografico sopra tutto */}
          {introVisible && (
            <IntroOverlay
              minVisibleMs={1500}
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
              title={t('tip.pitchUp')}
            >
              ↑
            </button>
            <button
              onClick={() => setTilt((t) => ({ ...t, pitch: clampPitch(t.pitch - 5) }))}
              className="view-btn"
              aria-label="Abbassa la camera"
              title={t('tip.pitchDown')}
            >
              ↓
            </button>
            <button
              onClick={resetView}
              className="view-btn"
              aria-label="Reimposta visuale"
              title={t('tip.reset')}
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
              onQuizRequest={(name) => {
                setQuizFocus(name);
                setShowQuiz(true);
              }}
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

        {/* Sidebar controlli: su desktop è la colonna laterale; su mobile
            diventa una bottom sheet che copre la scena solo quando aperta
            (FAB "☰ Controlli" in basso a destra). Il contenuto resta sempre
            montato: la lista pianeti resta accessibile agli screen reader. */}
        <div className={isMobile ? 'pointer-events-none absolute inset-0' : 'relative'}>
          <div
            id="controls-sheet"
            className={
              isMobile
                ? `mobile-sheet pointer-events-auto ${controlsSheetOpen ? 'open' : ''}`
                : 'relative'
            }
          >
            {isMobile && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0d0d2a]/95 px-4 py-2">
                <span className="mobile-sheet-grip" aria-hidden />
                <button
                  onClick={() => setControlsSheetOpen(false)}
                  aria-label="Chiudi pannello controlli"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            {isMobile && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0d0d2a]/95 px-4 py-2">
                <label
                  className="flex items-center gap-2 text-xs text-white/75"
                  htmlFor="sim-date-mobile"
                >
                  📅 Data
                  <input
                    id="sim-date-mobile"
                    type="date"
                    value={simDate ? simDate.toISOString().slice(0, 10) : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSimDate(v ? new Date(`${v}T12:00:00Z`) : null);
                    }}
                    className="rounded-lg border border-white/15 bg-[#141433] px-2 py-1 text-xs text-white"
                  />
                </label>
                {simDate && (
                  <button onClick={goToToday} className="chip" title={t('tip.today')}>
                    {t('chip.today')}
                  </button>
                )}
              </div>
            )}
            <ControlsSidebar
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              speed={speed}
              onSpeedChange={setSpeed}
              speedOptions={SPEED_OPTIONS}
              planets={planets}
              selectedName={selectedPlanet?.name ?? null}
              onSelectPlanet={(p) => {
                handleSelectPlanet(p);
                // Su mobile la sheet si chiude per lasciare spazio al
                // pannello info e alla scena sul pianeta scelto.
                setControlsSheetOpen(false);
              }}
              currentDate={currentDate}
            />
          </div>
          {/* Onboarding tip: mostrato al primo avvio, dopo l'intro cinematografico.
              Su mobile è ancorato in basso al centro (la sidebar non è visibile). */}
          {!introVisible && (
            <OnboardingTip
              text={t('onboarding.text')}
              side={isMobile ? 'top' : 'right'}
              {...(isMobile
                ? { bottom: '96px', left: '16px', right: '16px' }
                : { top: '40%', left: '-260px' })}
            />
          )}
        </div>
      </div>

      {/* 4.11 — Flash overlay per feedback screenshot (200ms). */}
      {screenshotFlash && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[1000] bg-white"
          style={{ animation: 'screenshot-flash 200ms ease-out forwards' }}
        />
      )}

      {/* FAB controlli mobile: apre/chiude la bottom sheet. Nascosto su
          desktop (>= 1024px) dove la sidebar è sempre visibile. */}
      {isMobile && (
        <button
          type="button"
          className="mobile-fab"
          onClick={() => setControlsSheetOpen((v) => !v)}
          aria-expanded={controlsSheetOpen}
          aria-controls="controls-sheet"
        >
          <span aria-hidden>{controlsSheetOpen ? '✕' : '☰'}</span>
          <span>{controlsSheetOpen ? t('chip.controlsClose') : t('chip.controls')}</span>
        </button>
      )}

      <Suspense fallback={null}>
        {showCompare && <CompareModal planets={planets} onClose={() => setShowCompare(false)} />}
        {showEvents && (
          <EventsModal
            open={showEvents}
            onClose={() => setShowEvents(false)}
            onGoTo={(e: import('./utils/celestialEvents').CelestialEvent) => {
              setShowEvents(false);
              // Seleziona il pianeta primario (per congiunzioni: il primo; per opposizioni: il pianeta)
              const primary = e.kind === 'conjunction' ? e.a : e.a;
              const p = planets.find((x) => x.name === primary);
              if (p) setSelectedPlanet(p);
            }}
          />
        )}
        {showSky && <SkyViewModal open={showSky} onClose={() => setShowSky(false)} />}
        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            commands={paletteCommands}
          />
        )}
        {showQuiz && (
          <QuizModal
            planets={planets}
            onClose={() => {
              setShowQuiz(false);
              setQuizFocus(null);
            }}
            rnd={stableQuizRnd}
            focusPlanet={quizFocus ?? undefined}
          />
        )}
      </Suspense>
    </div>
  );
}

interface OverflowItem {
  key: string;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}

/** Bottone "⋯" che apre un menu dropdown con le voci secondarie dell'header.
 *  Pensato per header stretti: se i chip entrano, `flex-wrap` li tiene in linea
 *  — il menu aggiunge solo uno shortcut cliccabile per le 3 voci più "nascoste". */
function OverflowMenu({ items }: { items: OverflowItem[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('tip.more')}
        title={t('tip.more')}
        className={`chip ${open ? 'active' : ''}`}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="panel-in absolute right-0 top-full z-50 mt-1.5 flex min-w-[180px] flex-col gap-0.5 rounded-lg border border-white/10 bg-[#0d0d2a]/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          {items.map((it) => (
            <button
              key={it.key}
              role="menuitem"
              onClick={() => {
                it.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/10 ${
                it.active ? 'text-white' : 'text-white/75'
              }`}
              title={it.title}
            >
              <span>{it.label}</span>
              {it.active && (
                <span className="text-purple-300" aria-hidden>
                  ●
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
