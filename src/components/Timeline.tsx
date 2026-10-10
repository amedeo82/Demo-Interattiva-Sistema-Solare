/**
 * <Timeline /> — scrubber interattivo del tempo di simulazione.
 *
 * Mostra una barra con un thumb trascinabile: l'utente può muovere
 * avanti/indietro la simulazione di ±range anni (default 2) rispetto
 * all'epoca corrente. Supporta mouse, touch e tastiera (←/→ con focus).
 *
 * NB: la timeline NON sostituisce la data scelta: riposiziona la simulazione
 * di un offset di secondi di sim, lasciando invariata l'epoca. Quando
 * l'utente trascina, lo stato `paused` viene impostato per evitare che il
 * motore "scappi" durante l'interazione.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimelineProps {
  /** Secondi simulati corrispondenti all'inizio della timeline. */
  baseSimTime: number;
  /** Secondi simulati correnti (per posizionare il thumb). */
  currentSimTime: number;
  /** Range totale (in secondi di sim) coperto dalla timeline, simmetrico
   *  rispetto a baseSimTime. Default: 4 anni terrestri = 4 × 10s = 40s. */
  rangeSimSeconds?: number;
  /** Secondi simulati per anno terrestre. */
  yearSimSeconds: number;
  /** Sposta la simulazione al tempo specificato. */
  onSeek: (simTime: number) => void;
  /** Notifica lo stato di drag (true durante l'interazione, false al rilascio). */
  onDragChange?: (dragging: boolean) => void;
}

const KEYBOARD_STEP_YEARS = 0.1;

export default function Timeline({
  baseSimTime,
  currentSimTime,
  rangeSimSeconds = 40,
  yearSimSeconds,
  onSeek,
  onDragChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const min = baseSimTime - rangeSimSeconds / 2;
  const max = baseSimTime + rangeSimSeconds / 2;
  const value = Math.min(max, Math.max(min, currentSimTime));
  const fillPct = ((value - min) / (max - min)) * 100;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
      const ratio = x / rect.width;
      const t = min + ratio * (max - min);
      onSeek(t);
    },
    [min, max, onSeek]
  );

  useEffect(() => {
    if (!dragging) return;
    onDragChange?.(true);
    const move = (e: PointerEvent) => seekFromClientX(e.clientX);
    const up = () => {
      setDragging(false);
      onDragChange?.(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, seekFromClientX, onDragChange]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = yearSimSeconds * KEYBOARD_STEP_YEARS;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(min, value - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(max, value + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(baseSimTime);
    }
  };

  const yearsFromBase = (value - baseSimTime) / yearSimSeconds;
  const yearsLabel =
    Math.abs(yearsFromBase) < 0.05
      ? 'Oggi'
      : yearsFromBase > 0
        ? `+${yearsFromBase.toFixed(2)} anni`
        : `${yearsFromBase.toFixed(2)} anni`;

  return (
    <div className="timeline" role="group" aria-label="Timeline della simulazione">
      <span className="font-mono text-[10px] text-white/50 tabular-nums" title="Inizio timeline">
        −{(rangeSimSeconds / 2 / yearSimSeconds).toFixed(0)}y
      </span>
      <div
        ref={trackRef}
        className="timeline-track"
        style={{ ['--tl-fill' as string]: `${fillPct}%` }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
          seekFromClientX(e.clientX);
        }}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={yearsLabel}
        onKeyDown={onKeyDown}
      >
        <div className="timeline-fill" />
        <div className="timeline-thumb" style={{ left: `${fillPct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-white/50 tabular-nums" title="Fine timeline">
        +{(rangeSimSeconds / 2 / yearSimSeconds).toFixed(0)}y
      </span>
      <span
        className="ml-2 font-mono text-[11px] text-white/80 tabular-nums min-w-[68px] text-right"
        aria-live="polite"
      >
        {yearsLabel}
      </span>
    </div>
  );
}
