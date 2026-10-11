/**
 * S10a · M4 — Quality governor adattivo.
 *
 * Riduce automaticamente dpr e conteggi delle fasce di particelle quando
 * il FPS misurato scende sotto soglia per più finestre consecutive, e
 * li ripristina gradualmente quando le prestazioni si stabilizzano.
 *
 * **Logica** (pura, testabile):
 *  - finestra FPS rolling 2 secondi
 *  - **Down**: media < 42 per 3 finestre consecutive → −1 tier
 *  - **Up**: media > 57 per 5 secondi **e** cooldown 30s → +1 tier
 *  - **Stall immediato**: media < 25 per 1 finestra → −1 tier
 *  - floor: tier ≥ 0; ceiling: tier ≤ initialTier (non sale sopra mobile/desktop)
 *
 * Non tocca `postFxEnabled` (decisione utente).
 */

/** Profili di qualità, dal massimo (0) al minimo (3). */
export const QUALITY_TIERS = [
  { dpr: 1.75, beltScale: 1.0, kuiperScale: 1.0 },
  { dpr: 1.5, beltScale: 0.8, kuiperScale: 0.75 },
  { dpr: 1.25, beltScale: 0.55, kuiperScale: 0.5 },
  { dpr: 1.0, beltScale: 0.35, kuiperScale: 0.3 },
] as const;

export const DOWN_THRESHOLD_FPS = 42;
export const STALL_THRESHOLD_FPS = 25;
export const UP_THRESHOLD_FPS = 57;
export const DOWN_WINDOWS_REQUIRED = 3; // finestre consecutive < 42
export const UP_DWELL_MS = 5_000; // ms sopra soglia prima di salire
export const UP_COOLDOWN_MS = 30_000; // minimo fra due "up"
export const WINDOW_MS = 2_000;

export type TierChange = 'up' | 'down' | 'stay';

export interface GovernorInput {
  /** Media FPS calcolata sulla finestra corrente. */
  fps: number;
  /** Tier corrente (0 = max, 3 = min). */
  tier: number;
  /** Tier iniziale (mobile=2, desktop=0): non sale sopra. */
  initialTier: number;
  /** Timestamp (ms) dell'ultimo cambio tier. */
  lastChangeMs: number;
  /** Now (ms). */
  now: number;
  /** Quante finestre consecutive sotto soglia "down". */
  lowWindowsInARow: number;
  /** Da quanto tempo cumulativo (ms) siamo stati sopra la soglia "up".
   *  Il chiamante incrementa di WINDOW_MS ad ogni finestra "up" e resetta
   *  a 0 quando il FPS scende sotto soglia. */
  highDwellMs: number;
}

export interface GovernorOutput {
  /** Nuovo tier. */
  tier: number;
  /** Tipo di cambio. */
  change: TierChange;
  /** Nuovo lastChangeMs (se change != 'stay'). */
  lastChangeMs: number;
  /** Conteggio finestre consecutive sotto soglia (aggiornato). */
  lowWindowsInARow: number;
  /** Dwell sopra soglia (aggiornato). */
  highDwellMs: number;
}

export function nextTier(input: GovernorInput): GovernorOutput {
  const { fps, tier, initialTier, lastChangeMs, now, lowWindowsInARow, highDwellMs } = input;

  // Stall immediato: down senza attendere le 3 finestre
  if (fps < STALL_THRESHOLD_FPS) {
    return {
      tier: Math.min(QUALITY_TIERS.length - 1, tier + 1),
      change: 'down',
      lastChangeMs: now,
      lowWindowsInARow: lowWindowsInARow + 1,
      highDwellMs: 0,
    };
  }

  // Down lento: 3 finestre consecutive sotto DOWN_THRESHOLD
  if (fps < DOWN_THRESHOLD_FPS) {
    if (lowWindowsInARow + 1 >= DOWN_WINDOWS_REQUIRED) {
      return {
        tier: Math.min(QUALITY_TIERS.length - 1, tier + 1),
        change: 'down',
        lastChangeMs: now,
        lowWindowsInARow: 0, // reset dopo cambio
        highDwellMs: 0,
      };
    }
    return {
      tier,
      change: 'stay',
      lastChangeMs,
      lowWindowsInARow: lowWindowsInARow + 1,
      highDwellMs: 0,
    };
  }

  // Up: sopra UP_THRESHOLD per almeno UP_DWELL_MS e cooldown rispettato
  if (fps > UP_THRESHOLD_FPS) {
    if (highDwellMs >= UP_DWELL_MS && now - lastChangeMs >= UP_COOLDOWN_MS) {
      // Non salire sopra il tier iniziale (es. mobile floor)
      if (tier > initialTier) {
        return {
          tier: tier - 1,
          change: 'up',
          lastChangeMs: now,
          lowWindowsInARow: 0,
          highDwellMs: 0,
        };
      }
    }
    return {
      tier,
      change: 'stay',
      lastChangeMs,
      lowWindowsInARow: 0,
      // Il chiamante incrementerà questo di WINDOW_MS ad ogni finestra
      highDwellMs,
    };
  }

  // Banda neutra (42..57): reset dwell alto, mantieni finestre basse a 0
  return {
    tier,
    change: 'stay',
    lastChangeMs,
    lowWindowsInARow: 0,
    highDwellMs: 0,
  };
}
