/**
 * <TelemetryHUD /> — barra telemetria live in sovraimpressione (DOM puro).
 *
 * Mostra speed, data di simulazione, distanza camera dal Sole e FPS stimati.
 * I valori "live" (distanza, FPS) sono letti via ref aggiornati a 60Hz
 * dentro il <Canvas>, e rinfrescati qui a 2Hz per evitare flicker.
 *
 * S15 — la badge FPS si auto-nasconde quando il frame rate è OK (≥ 30).
 * Appare solo se scende sotto soglia per >1s, per evitare il flicker su
 * micro-stall. Riduce il rumore visivo in header (era sempre accesa).
 */
import { useEffect, useReducer, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

const FPS_LOW_THRESHOLD = 30;
const FPS_LOW_HOLD_MS = 1000;

export interface TelemetryHUDProps {
  speed: number;
  currentDate: Date;
  cameraDistanceRef: MutableRefObject<number>;
  fpsRef: MutableRefObject<number>;
}

const REFRESH_MS = 500;

/** useReducer con dispatch vuoto → forza re-render puro per rileggere i ref. */
function useForceRender() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  return force;
}

export function TelemetryHUD({ speed, currentDate, cameraDistanceRef, fpsRef }: TelemetryHUDProps) {
  const force = useForceRender();
  useEffect(() => {
    const id = setInterval(force, REFRESH_MS);
    return () => clearInterval(id);
  }, [force]);

  const distance = cameraDistanceRef.current;
  const fps = fpsRef.current;
  const dateStr = currentDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const speedAccent = speed >= 5 ? '#ff7e2e' : undefined;

  // FPS basso persistente: la badge appare solo se fps < soglia per >1s.
  const lowSinceRef = useRef<number | null>(null);
  const [showFps, setShowFps] = useState(false);
  useEffect(() => {
    const now = performance.now();
    if (fps > 0 && fps < FPS_LOW_THRESHOLD) {
      if (lowSinceRef.current === null) lowSinceRef.current = now;
      if (!showFps && now - (lowSinceRef.current ?? now) > FPS_LOW_HOLD_MS) setShowFps(true);
    } else {
      lowSinceRef.current = null;
      if (showFps) setShowFps(false);
    }
    // showFps è volutamente escluso dai deps: il guard di uscita (sopra)
    // usa il valore corrente di state e viene rivalutato ad ogni frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fps]);

  return (
    <div
      className="pointer-events-none absolute top-3 left-3 z-10 flex gap-2 font-mono text-[10px] uppercase tracking-[0.18em]"
      aria-hidden
    >
      <HudBadge label="SPD" value={`${speed.toFixed(2)}x`} accent={speedAccent} />
      <HudBadge label="DATE" value={dateStr} />
      <HudBadge label="DIST" value={`${distance.toFixed(1)}u`} />
      {showFps && (
        <HudBadge
          label="FPS"
          value={fps > 0 ? fps.toFixed(0) : '—'}
          accent={fps > 0 && fps < 30 ? '#ff5252' : undefined}
        />
      )}
    </div>
  );
}

function HudBadge({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded border border-white/15 bg-black/50 px-2 py-1 backdrop-blur-sm"
      style={{
        borderColor: accent ? `${accent}66` : undefined,
        boxShadow: accent ? `0 0 12px ${accent}40` : undefined,
        textShadow: accent ? `0 0 6px ${accent}66` : undefined,
      }}
    >
      <span className="text-white/45">{label} </span>
      <span style={{ color: accent ?? 'white' }}>{value}</span>
    </div>
  );
}
