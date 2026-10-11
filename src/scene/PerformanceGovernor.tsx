/**
 * S10a · M4 — Performance governor (componente).
 *
 * Riduce `dpr` del renderer e i conteggi delle fasce asteroidi/Kuiper
 * quando il FPS misurato è sotto soglia. NON si attiva di default:
 * la prop `enabled` deve essere true (per ora solo manuale; in futuro
 * sarà un chip "Auto-qualità" in header).
 *
 * Il governor NON tocca `postFxEnabled` (decisione utente) e NON
 * rimuove i componenti dalla scena: modifica imperativamente
 * `gl.setPixelRatio` e i `geometry.setDrawRange` delle fasce.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { QUALITY_TIERS, WINDOW_MS, nextTier } from '../utils/qualityTiers';

export interface PerformanceGovernorProps {
  /** Se false (default), il governor è un no-op. */
  enabled?: boolean;
  /** Tier iniziale (0 = desktop, 2 = mobile). Default 0. */
  initialTier?: number;
  /** Ref al FPS corrente (calcolato da CameraTracker). */
  fpsRef: { current: number };
  /** Ref che vengono aggiornati per i consumer: il `qualityScale` per
   *  la fascia asteroidi/kuiper (in [0..1]) e il dpr attuale. */
  beltScaleRef: { current: number };
  kuiperScaleRef: { current: number };
  dprRef: { current: number };
}

interface GovernorState {
  tier: number;
  lastChangeMs: number;
  lowWindowsInARow: number;
  highDwellMs: number;
}

export function PerformanceGovernor({
  enabled = false,
  initialTier = 0,
  fpsRef,
  beltScaleRef,
  kuiperScaleRef,
  dprRef,
}: PerformanceGovernorProps): null {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const stateRef = useRef<GovernorState>({
    tier: initialTier,
    lastChangeMs: performance.now(),
    lowWindowsInARow: 0,
    highDwellMs: 0,
  });
  const lastTickRef = useRef<number>(performance.now());

  useEffect(() => {
    // Inizializza i ref con il tier iniziale
    const t = QUALITY_TIERS[initialTier];
    dprRef.current = t.dpr;
    beltScaleRef.current = t.beltScale;
    kuiperScaleRef.current = t.kuiperScale;
  }, [initialTier, dprRef, beltScaleRef, kuiperScaleRef]);

  useFrame(() => {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastTickRef.current < WINDOW_MS) return; // tick ogni WINDOW_MS
    lastTickRef.current = now;

    const fps = fpsRef.current;
    if (fps <= 0) return; // non ancora misurato

    const s = stateRef.current;
    const out = nextTier({
      fps,
      tier: s.tier,
      initialTier,
      lastChangeMs: s.lastChangeMs,
      now,
      lowWindowsInARow: s.lowWindowsInARow,
      highDwellMs: s.highDwellMs,
    });

    s.tier = out.tier;
    s.lastChangeMs = out.lastChangeMs;
    s.lowWindowsInARow = out.lowWindowsInARow;
    // Incrementa dwell solo se la finestra corrente è "up"
    s.highDwellMs = fps > 57 ? out.highDwellMs + WINDOW_MS : 0;

    if (out.change !== 'stay') {
      const t = QUALITY_TIERS[out.tier];
      dprRef.current = t.dpr;
      beltScaleRef.current = t.beltScale;
      kuiperScaleRef.current = t.kuiperScale;
      // Applica dpr al renderer R3F
      setDpr(t.dpr);
      // eslint-disable-next-line no-console
      console.info(`[PerformanceGovernor] tier → ${out.tier} (${out.change}): dpr=${t.dpr}`);
    }
  });

  return null;
}
