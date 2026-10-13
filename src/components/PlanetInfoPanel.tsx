import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { PlanetData } from '../data/planets';
import { formatNumber, formatOrbitalPeriod } from '../utils/format';
import { useOrbitCounters } from '../hooks/useOrbitCounters';
import { useIsMobile } from '../hooks/useMedia';
import type { SimPlanetState } from '../hooks/useOrbitEngine';
import { PREFS_KEYS, loadJSON, saveJSON, type PanelPos } from '../utils/prefs';
import { useNarration } from '../hooks/useNarration';
import { useT } from '../i18n';

interface Props {
  planet: PlanetData;
  onClose: () => void;
  positionsRef: { current: Record<string, SimPlanetState> };
  /** S14 · F8 — apre il quiz in modalità focus su questo pianeta. */
  onQuizRequest?: (planetName: string) => void;
}

type Tab = 'data' | 'atmosphere' | 'missions' | 'trivia';

const TAB_KEYS: Record<Tab, string> = {
  data: 'panel.tabData',
  atmosphere: 'panel.tabAtmosphere',
  missions: 'panel.tabMissions',
  trivia: 'panel.tabTrivia',
};

const TAB_ICONS: Record<Tab, string> = {
  data: '📊',
  atmosphere: '🌫',
  missions: '🚀',
  trivia: '💡',
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/70 text-xs">{label}</span>
      <span className="text-white text-sm font-medium text-right tabular-nums">{value}</span>
    </div>
  );
}

function validatePos(v: unknown): v is PanelPos {
  if (!v || typeof v !== 'object') return false;
  const o = v as { x?: unknown; y?: unknown };
  return typeof o.x === 'number' && typeof o.y === 'number' && isFinite(o.x) && isFinite(o.y);
}

export default function PlanetInfoPanel({ planet, onClose, positionsRef, onQuizRequest }: Props) {
  // Mobile: il pannello diventa una bottom sheet a tutta larghezza
  // (niente drag/posizione persistita: su schermo stretto non c'è spazio).
  const isMobile = useIsMobile();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Lista pianeti stabile: passata al hook useOrbitCounters, che la mette
  // nei deps dell'effect. Se creassimo un array nuovo a ogni render,
  // l'rAF loop verrebbe cancellato e `lastAngleRef` resettato → i counter
  // tornerebbero a 0 ogni volta che si cambia tab o si rende il pannello.
  const allBodyNames = useMemo(
    () => ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    []
  );
  const { counters: orbitCountersRef, progress: orbitProgressRef } = useOrbitCounters(
    positionsRef,
    allBodyNames
  );
  // S15 · M9-c — prima c'era un setInterval(2000ms) che forzava un
  // re-render dell'intero PlanetInfoPanel (4 tab, drag handlers, scan
  // line) ogni 2 secondi anche se il counter non era cambiato.
  // Ora: stato locale `progressDisplay` (count + fraction) che si
  // aggiorna solo quando la parte INTERA del count o la FRAZIONE a 2
  // decimali cambia. Poll ogni 500ms, ma il re-render è condizionato.
  // Risultato: re-render solo quando "3 → 4" o "0.42 → 0.43", ~4-5
  // volte l'ora anziché 30.
  const [progressDisplay, setProgressDisplay] = useState<{
    count: number;
    fraction: number;
  }>({ count: 0, fraction: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const cur = orbitProgressRef.current[planet.name] ?? { count: 0, fraction: 0 };
      // Round fraction a 2 decimali per evitare di triggare re-render
      // su cambiamenti sub-pixel che l'utente non può percepire.
      const roundedFrac = Math.round(cur.fraction * 100) / 100;
      setProgressDisplay((prev) => {
        if (prev.count === cur.count && prev.fraction === roundedFrac) return prev;
        return { count: cur.count, fraction: roundedFrac };
      });
    }, 500);
    return () => clearInterval(id);
  }, [orbitProgressRef, planet.name]);

  // Focus iniziale sul pulsante di chiusura del dialog
  useEffect(() => {
    closeRef.current?.focus();
  }, [planet.name]);

  // Posizione trascinabile: persistita in localStorage (pixel relativi al
  // contenitore <main>, dall'angolo top-right). Solo desktop.
  const [pos, setPos] = useState<PanelPos | null>(() =>
    loadJSON(PREFS_KEYS.panelPos, null, validatePos)
  );
  useEffect(() => {
    if (pos) saveJSON(PREFS_KEYS.panelPos, pos);
  }, [pos]);

  // Drag del pannello: handle in header (cursore grab).
  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const current = pos ?? { x: 16, y: 16 };
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: current.x,
        origY: current.y,
      };
    },
    [pos]
  );

  const onDragMove = useCallback((e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    // Invertiamo la X: drag a destra = pannello va più a destra = x aumenta.
    setPos({ x: s.origX - dx, y: s.origY - dy });
  }, []);

  const onDragEnd = useCallback((e: React.PointerEvent) => {
    dragStateRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* già rilasciato */
    }
  }, []);

  const resetPos = useCallback(() => {
    setPos(null);
    try {
      localStorage.removeItem(PREFS_KEYS.panelPos);
    } catch {
      /* noop */
    }
  }, []);

  // Tab attivo: default "Dati". Persistito in sessionStorage per la sessione
  // corrente (non a lungo termine, così riaprendo un pianeta si riparte dai dati).
  const [tab, setTab] = useState<Tab>('data');
  useEffect(() => {
    setTab('data');
  }, [planet.name]);

  const periodLabel = formatOrbitalPeriod(planet.orbitalPeriod);
  // S15 · M9-c — `totalOrbits` è letto dal ref direttamente (la somma
  // di tutti i pianeti). Non throttlato: cambia raramente (un wrap ogni
  // pochi minuti a 1x, 8 pianeti), il "mancato" update si corregge al
  // prossimo tick di `progressDisplay`.
  const totalOrbits = Object.values(orbitCountersRef.current).reduce((a, b) => a + b, 0);
  // Format: "3 (0.42/1)" — orbite complete + frazione in corso.
  // Mostra la frazione solo se > 0 (a sessione appena iniziata nascondiamo
  // il "(0.00/1)" che sarebbe rumore).
  const orbitsLabel =
    progressDisplay.fraction > 0.01
      ? `${progressDisplay.count} (${progressDisplay.fraction.toFixed(2)}/1)`
      : `${progressDisplay.count}`;

  // S14 · F7 — Narrazione TTS: legge descrizione + prima curiosità.
  // Solo su click utente (o tasto N col focus nel pannello); mai auto-play.
  const narrationText = `${planet.nameIt}. ${planet.description} ${planet.facts.trivia[0] ?? ''}`;
  const narration = useNarration(narrationText);
  const t = useT();

  // Escape chiude: lo gestiamo a livello di dialog (oltre a quello globale in App).
  // S14 · F7 — `n` avvia/interrompe la narrazione TTS (focus dentro il pannello).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'n' || e.key === 'N') {
        e.stopPropagation();
        narration.toggle();
      }
    },
    [onClose, narration]
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Informazioni su ${planet.nameIt}`}
      onKeyDown={onKeyDown}
      style={
        isMobile ? undefined : pos ? { top: pos.y, right: pos.x } : { top: '1rem', right: '1rem' }
      }
      className={
        isMobile
          ? 'panel-in panel-scanline absolute inset-x-0 bottom-0 z-[200] flex max-h-[72dvh] w-full flex-col overflow-hidden rounded-t-2xl p-0'
          : 'panel-in panel-scanline absolute z-[200] flex\n                 w-[min(360px,calc(100vw-2rem))] flex-col rounded-2xl p-0\n                 max-h-[calc(100%-2rem)] overflow-hidden'
      }
    >
      {/* Handle + titolo compatto (orizzontale). Su mobile: grab bar fissa
          in alto (no drag, no reset posizione). */}
      <div
        onPointerDown={isMobile ? undefined : onDragStart}
        onPointerMove={isMobile ? undefined : onDragMove}
        onPointerUp={isMobile ? undefined : onDragEnd}
        onPointerCancel={isMobile ? undefined : onDragEnd}
        className={`flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 select-none ${
          isMobile ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
        title={isMobile ? undefined : 'Trascina per riposizionare'}
        data-testid="panel-drag-handle"
      >
        {isMobile && <div className="mobile-sheet-grip absolute left-1/2 top-1.5" aria-hidden />}
        <div
          className="relative h-9 w-9 shrink-0 rounded-full"
          aria-hidden
          style={{
            background: planet.gradient,
            boxShadow: `0 0 16px ${planet.color}66, inset -4px -4px 8px rgba(0,0,0,0.45)`,
          }}
        >
          {planet.name === 'Saturn' && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border"
              style={{ borderColor: 'rgba(232, 208, 136, 0.55)' }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight">{planet.nameIt}</h2>
          <p className="truncate text-[10px] uppercase tracking-widest text-white/65">
            {planet.name} · {planet.symbol}
          </p>
        </div>
        {narration.supported && (
          <button
            onClick={narration.toggle}
            aria-label={narration.speaking ? t('panel.narrateStop') : t('panel.narrate')}
            aria-pressed={narration.speaking}
            title={
              narration.speaking ? `${t('panel.narrateStop')} (N)` : `${t('panel.narrate')} (N)`
            }
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] transition-colors ${
              narration.speaking
                ? 'border-purple-400/60 bg-purple-500/25 text-white'
                : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            {narration.speaking ? '⏹' : '🔊'}
          </button>
        )}
        {!isMobile && pos && (
          <button
            onClick={resetPos}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[11px] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Ripristina posizione pannello"
            title="Ripristina posizione predefinita"
          >
            ⤧
          </button>
        )}
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Chiudi pannello"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-sm text-white/70 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
        >
          ✕
        </button>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Sezioni informazioni pianeta"
        className="flex shrink-0 gap-1 border-b border-white/10 bg-black/20 px-2 py-1.5"
      >
        {(Object.keys(TAB_KEYS) as Tab[]).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              tab === id
                ? 'bg-white/15 text-white'
                : 'text-white/55 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <span aria-hidden className="mr-1">
              {TAB_ICONS[id]}
            </span>
            {t(TAB_KEYS[id])}
          </button>
        ))}
      </div>

      {/* Contenuto scrollabile */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === 'data' && (
          <div className="flex flex-col">
            <p className="mb-3 text-[13px] italic leading-relaxed text-white/70">
              {planet.description}
            </p>
            <StatRow label="Diametro" value={`${formatNumber(planet.diameter)} km`} />
            <StatRow
              label="Distanza dal Sole"
              value={`${formatNumber(planet.distanceFromSun)} mln km`}
            />
            <StatRow label="Periodo orbitale" value={periodLabel} />
            <StatRow label="Rotazione (giorno)" value={planet.facts.dayLength} />
            <StatRow label="Inclinazione assiale" value={`${planet.axialTilt}°`} />
            <StatRow label="Eccentricità orbita" value={planet.eccentricity.toFixed(4)} />
            <StatRow
              label={t(
                planet.facts.moonsCount === 1 ? 'panel.moonsShownOne' : 'panel.moonsShownMany',
                { count: planet.facts.moonsCount }
              )}
              value={
                planet.moons.length > 0 ? planet.moons.map((m) => m.name).join(', ') : 'Nessuno'
              }
            />
            <p className="mt-3 text-[10px] uppercase tracking-wider text-white/65">
              Sessione corrente
            </p>
            <StatRow label={`Orbite di ${planet.nameIt}`} value={orbitsLabel} />
            <StatRow label="Orbite totali (tutti i corpi)" value={`${totalOrbits}`} />
          </div>
        )}

        {tab === 'atmosphere' && (
          <div className="text-sm leading-relaxed text-white/80">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/65">Composizione</p>
            <p className="mb-4">{planet.facts.atmosphere}</p>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/65">Clima</p>
            <p className="rounded-lg bg-white/5 px-3 py-2 text-sm">🌡️ {planet.facts.temperature}</p>
          </div>
        )}

        {tab === 'missions' && (
          <div>
            {planet.facts.missions.length === 0 ? (
              <p className="text-sm text-white/70">{t('panel.noMissions')}</p>
            ) : (
              /* S14 · F10 — timeline verticale delle missioni, ordinata per anno */
              <ol className="relative ml-2 space-y-3 border-l border-white/15 pl-4">
                {planet.facts.missions.map((m) => (
                  <li key={`${m.name}-${m.year}`} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"
                    />
                    <p className="text-sm font-medium leading-tight text-white">{m.name}</p>
                    <p className="text-[11px] text-white/65">
                      {m.year}
                      {m.note ? ` · ${m.note}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === 'trivia' && (
          <div>
            <ul className="mb-3 space-y-1.5 text-sm text-white/80">
              {planet.facts.trivia.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span aria-hidden className="text-yellow-300/80">
                    ★
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200/90">
              📏 {planet.facts.comparison}
            </p>
            {onQuizRequest && (
              <button
                type="button"
                onClick={() => onQuizRequest(planet.name)}
                className="mt-3 w-full rounded-lg bg-purple-500/20 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-500/30"
              >
                {t('panel.quizMe')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
