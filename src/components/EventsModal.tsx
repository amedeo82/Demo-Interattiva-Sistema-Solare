/**
 * S11 · F2 — Modal "Eventi celesti".
 *
 * Lista le congiunzioni/opposizioni in un range selezionato. Click
 * su "Vai" → callback onGoTo(event.date) che App usa per fare
 * seekTo + selectBody primario. Calcolo lazy: solo quando il modal
 * viene aperto (per evitare lavoro inutile durante la simulazione).
 *
 * Tolleranze: il modello kepleriano semplificato diverge da JPL
 * Horizons (vedi docs/ROADMAP.md §3.2). Le date degli eventi sono
 * indicative, non astronomicamente precise.
 */
import { useEffect, useState } from 'react';
import { useT, localeTag } from '../i18n';
import { findConjunctions, findOppositions, type CelestialEvent } from '../utils/celestialEvents';

interface EventsModalProps {
  open: boolean;
  onClose: () => void;
  onGoTo: (event: CelestialEvent) => void;
  /** Data iniziale (default: oggi). */
  from?: Date;
  /** Range di mesi (default 12). */
  rangeMonths?: number;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(localeTag(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function eventLabel(
  e: CelestialEvent,
  t: (k: string, vars?: Record<string, string | number>) => string
): string {
  if (e.kind === 'conjunction') return t('events.conjunction', { a: e.a, b: e.b ?? '' });
  if (e.kind === 'opposition') return t('events.opposition', { a: e.a });
  return t('events.opposition', { a: e.a });
}

export function EventsModal({ open, onClose, onGoTo, from, rangeMonths = 12 }: EventsModalProps) {
  const t = useT();
  const [events, setEvents] = useState<CelestialEvent[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    const start = from ?? new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + rangeMonths);
    // Esegui il calcolo in un microtask per non bloccare il render del modal
    Promise.resolve().then(() => {
      try {
        const conj = findConjunctions(start, end, { maxSepDeg: 60 });
        const opp = findOppositions(start, end);
        const all = [...conj, ...opp].sort((a, b) => a.date.getTime() - b.date.getTime());
        setEvents(all);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[EventsModal] calcolo eventi fallito:', err);
        setEvents([]);
      } finally {
        setBusy(false);
      }
    });
  }, [open, from, rangeMonths]);

  if (!open) return null;

  return (
    // Overlay a schermo intero con backdrop: la lista eventi non copre più
    // l'intera UI (header/sidebar/timeline) ma è un dialog centrato.
    // Click sul backdrop → chiudi (pattern condiviso con Quiz/CompareModal).
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('events.title')}
        className="panel-in surface glass flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl p-5"
        data-testid="events-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-white">{t('events.title')}</h2>
          <button
            type="button"
            aria-label={t('events.close')}
            onClick={onClose}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-white/65">
          {t('events.range', {
            from: fmtDate(from ?? new Date()),
            to: fmtDate(
              (() => {
                const d = new Date(from ?? new Date());
                d.setMonth(d.getMonth() + rangeMonths);
                return d;
              })()
            ),
          })}
          {t('events.disclaimer')}
        </p>
        <div className="mt-4 flex-1 overflow-y-auto">
          {busy ? (
            <p className="text-sm text-white/70">{t('events.computing')}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-white/70">{t('events.none')}</p>
          ) : (
            <ul className="space-y-1">
              {events.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-white">{eventLabel(e, t)}</span>
                    <span className="text-xs text-white/65">
                      {fmtDate(e.date)} · {t('events.sep', { deg: e.separationDeg.toFixed(2) })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoTo(e)}
                    className="rounded-md bg-purple-500/20 px-2 py-1 text-xs text-white hover:bg-purple-500/30"
                  >
                    {t('events.go')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
