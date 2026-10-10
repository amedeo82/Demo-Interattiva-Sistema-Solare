import { useEffect, useRef, useReducer, useState, useCallback } from 'react';
import type { PlanetData } from '../data/planets';
import { formatNumber, formatOrbitalPeriod } from '../utils/format';
import { useOrbitCounters, type OrbitCountersRef } from '../hooks/useOrbitCounters';
import { useIsMobile } from '../hooks/useMedia';
import type { SimPlanetState } from '../hooks/useOrbitEngine';
import { PREFS_KEYS, loadJSON, saveJSON, type PanelPos } from '../utils/prefs';

interface Props {
  planet: PlanetData;
  onClose: () => void;
  positionsRef: { current: Record<string, SimPlanetState> };
}

type Tab = 'data' | 'atmosphere' | 'missions' | 'trivia';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'data', label: 'Dati', icon: '📊' },
  { id: 'atmosphere', label: 'Atmosfera', icon: '🌫' },
  { id: 'missions', label: 'Missioni', icon: '🚀' },
  { id: 'trivia', label: 'Curiosità', icon: '💡' },
];

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="text-white text-sm font-medium text-right tabular-nums">{value}</span>
    </div>
  );
}

function validatePos(v: unknown): v is PanelPos {
  if (!v || typeof v !== 'object') return false;
  const o = v as { x?: unknown; y?: unknown };
  return typeof o.x === 'number' && typeof o.y === 'number' && isFinite(o.x) && isFinite(o.y);
}

export default function PlanetInfoPanel({ planet, onClose, positionsRef }: Props) {
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

  const orbitCountersRef: OrbitCountersRef = useOrbitCounters(positionsRef, [
    'Mercury',
    'Venus',
    'Earth',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
  ]);
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(() => force(), 2000);
    return () => clearInterval(id);
  }, []);

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

  // Escape chiude: lo gestiamo a livello di dialog (oltre a quello globale in App).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  const periodLabel = formatOrbitalPeriod(planet.orbitalPeriod);
  const totalOrbits = Object.values(orbitCountersRef.current).reduce((a, b) => a + b, 0);
  const thisOrbits = orbitCountersRef.current[planet.name] ?? 0;

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
          <p className="truncate text-[10px] uppercase tracking-widest text-white/40">
            {planet.name} · {planet.symbol}
          </p>
        </div>
        {!isMobile && pos && (
          <button
            onClick={resetPos}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
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
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-white/15 text-white'
                : 'text-white/55 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <span aria-hidden className="mr-1">
              {t.icon}
            </span>
            {t.label}
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
              label={`Satelliti mostrati (${planet.facts.moonsCount} totali)`}
              value={
                planet.moons.length > 0 ? planet.moons.map((m) => m.name).join(', ') : 'Nessuno'
              }
            />
            <p className="mt-3 text-[10px] uppercase tracking-wider text-white/40">
              Sessione corrente
            </p>
            <StatRow label={`Orbite di ${planet.nameIt}`} value={`${thisOrbits}`} />
            <StatRow label="Orbite totali (tutti i corpi)" value={`${totalOrbits}`} />
          </div>
        )}

        {tab === 'atmosphere' && (
          <div className="text-sm leading-relaxed text-white/80">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Composizione</p>
            <p className="mb-4">{planet.facts.atmosphere}</p>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Clima</p>
            <p className="rounded-lg bg-white/5 px-3 py-2 text-sm">🌡️ {planet.facts.temperature}</p>
          </div>
        )}

        {tab === 'missions' && (
          <ul className="space-y-1.5 text-sm text-white/80">
            {planet.facts.missions.length === 0 ? (
              <li className="text-white/50">Nessuna missione registrata.</li>
            ) : (
              planet.facts.missions.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <span aria-hidden className="text-white/40">
                    ▸
                  </span>
                  <span>{m}</span>
                </li>
              ))
            )}
          </ul>
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
          </div>
        )}
      </div>
    </div>
  );
}
