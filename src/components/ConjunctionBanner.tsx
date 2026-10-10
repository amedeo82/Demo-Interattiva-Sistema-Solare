/**
 * <ConjunctionBanner /> — overlay DOM che mostra la congiunzione corrente
 * (se presente). Sottoscritto all'event bus pubblicato da <Conjunctions />.
 * Si auto-dismissa 4 secondi dopo la fine della congiunzione.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeConjunction, type ConjunctionInfo } from '../scene/Conjunctions';
import { planets as PLANETS_DATA } from '../data/planets';

const NAME_IT: Record<string, string> = Object.fromEntries(
  PLANETS_DATA.map((p) => [p.name, p.nameIt])
);
const SYMBOL: Record<string, string> = Object.fromEntries(
  PLANETS_DATA.map((p) => [p.name, p.symbol])
);

const HIDE_DELAY_MS = 4000;

export function ConjunctionBanner() {
  const [info, setInfo] = useState<ConjunctionInfo | null>(null);
  const lastSeenRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeConjunction((c) => {
      if (c) {
        if (hideTimerRef.current != null) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        lastSeenRef.current = performance.now();
        setInfo(c);
      } else if (lastSeenRef.current != null) {
        hideTimerRef.current = window.setTimeout(() => {
          setInfo(null);
          lastSeenRef.current = null;
          hideTimerRef.current = null;
        }, HIDE_DELAY_MS);
      }
    });
  }, []);

  if (!info) return null;
  const a = NAME_IT[info.a] ?? info.a;
  const b = NAME_IT[info.b] ?? info.b;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-purple-400/40 bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span className="font-semibold">🌟 Congiunzione</span>{' '}
      <span>
        {SYMBOL[info.a]} {a}
      </span>
      <span className="mx-1 text-white/40">↔</span>
      <span>
        {SYMBOL[info.b]} {b}
      </span>
      <span className="ml-2 text-white/60">({info.bestSep.toFixed(1)}°)</span>
    </div>
  );
}
