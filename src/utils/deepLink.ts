/**
 * S11 · F1 — Deep link via URL hash.
 *
 * Lo stato selezionabile dell'app è codificato in `#p=<planet>&d=<iso>&v=<speed>&t=<csv>`
 * (es. `#p=Jupiter&d=2027-03-12&v=2&t=labels,realism`). Vantaggi dell'hash:
 *  - nessuna configurazione di Vercel/Apache per servire index.html su rotte
 *    "profonde";
 *  - compatibile con la PWA: il service worker non vede l'hash;
 *  - `replaceState` non sporca la history.
 *
 * Lo stato NON viene persistito in `prefs` quando proviene dall'hash
 * (è one-shot). Le modifiche utente successive aggiornano l'hash via
 * `history.replaceState` con debounce 300ms.
 */

import { planets } from '../data/planets';

export interface DeepLinkState {
  planetKey: string | null;
  /** Data ISO (yyyy-mm-dd) o null = "oggi". */
  date: string | null;
  /** Velocità di simulazione (0.1..20). */
  speed: number | null;
  /** Set di toggle attivi. */
  toggles: Set<DeepLinkToggle>;
}

export type DeepLinkToggle = 'labels' | 'realism' | 'eclipses' | 'realscale' | 'fx' | 'audiooff';

const VALID_TOGGLES: ReadonlySet<DeepLinkToggle> = new Set([
  'labels',
  'realism',
  'eclipses',
  'realscale',
  'fx',
  'audiooff',
]);

const VALID_PLANET_KEYS = new Set(planets.map((p) => p.name));
const MIN_SPEED = 0.1;
const MAX_SPEED = 20;

export function parseDeepLink(hashStr: string | null | undefined): DeepLinkState {
  const out: DeepLinkState = {
    planetKey: null,
    date: null,
    speed: null,
    toggles: new Set(),
  };
  if (!hashStr) return out;
  // Rimuovi # iniziale
  const cleaned = hashStr.replace(/^#/, '');
  if (!cleaned) return out;
  const params = new URLSearchParams(cleaned);
  const p = params.get('p');
  if (p && VALID_PLANET_KEYS.has(p)) {
    out.planetKey = p;
  }
  const d = params.get('d');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const date = new Date(d);
    if (!isNaN(date.getTime())) out.date = d;
  }
  const v = params.get('v');
  if (v) {
    const n = parseFloat(v);
    if (Number.isFinite(n) && n >= MIN_SPEED && n <= MAX_SPEED) {
      out.speed = n;
    }
  }
  const t = params.get('t');
  if (t) {
    for (const flag of t.split(',')) {
      if (VALID_TOGGLES.has(flag as DeepLinkToggle)) {
        out.toggles.add(flag as DeepLinkToggle);
      }
    }
  }
  return out;
}

export function encodeDeepLink(state: DeepLinkState): string {
  const params = new URLSearchParams();
  if (state.planetKey) params.set('p', state.planetKey);
  if (state.date) params.set('d', state.date);
  if (state.speed != null) params.set('v', String(state.speed));
  if (state.toggles.size > 0) params.set('t', Array.from(state.toggles).sort().join(','));
  const str = params.toString();
  return str ? `#${str}` : '';
}

/**
 * Writer con debounce. Restituisce una funzione `push(state)` che
 * aggiorna `window.location.hash` dopo 300ms di silenzio (no spam in
 * history grazie a `replaceState`).
 */
export function createHashWriter(debounceMs = 300): (state: DeepLinkState) => void {
  if (typeof window === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: DeepLinkState | null = null;
  return (state: DeepLinkState) => {
    pending = state;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!pending) return;
      const hash = encodeDeepLink(pending);
      const current = window.location.hash;
      if (`#${current.replace(/^#/, '')}` !== hash) {
        const url = window.location.pathname + window.location.search + hash;
        window.history.replaceState(null, '', url);
      }
    }, debounceMs);
  };
}
