/**
 * Configurazione centralizzata del sistema solare interattivo.
 * Tutti i parametri tunabili della simulazione e dell'interfaccia
 * vivono qui, così che App.tsx e i componenti restino puliti.
 */
import { J2000_MS } from './utils/kepler';

export const CONFIG = {
  /** Lato del "palco" quadrato del sistema solare (px). */
  stage: 800,
  /** Valori predefiniti selezionabili per la velocità di simulazione. */
  speedOptions: [0.25, 0.5, 1, 2, 5, 10] as number[],
  /** Velocità iniziale alla prima apertura. */
  defaultSpeed: 1,
  /** Epoca di riferimento J2000.0 (ms Unix), riusata da kepler.ts senza duplicarla. */
  j2000Ms: J2000_MS,
  /** Limiti e passo dei controlli di zoom (usati da rotellina, tasti +/- e pulsanti). */
  zoomMin: 0.4,
  zoomMax: 3,
  zoomStep: 0.25,
  /** Sensibilità dello zoom con rotellina (variazione per pixel di deltaY). */
  wheelZoomFactor: 0.0015,
  /** Secondi di simulazione a 1x corrispondenti a un anno terrestre:
   *  è animationDuration della Terra (10s) ed è il "taro" condiviso da
   *  data→tempo di simulazione, pannello laterale e fascia asteroidi. */
  earthYearSimSeconds: 10,
  /** Età dei punti della scia orbitale, come frazione fissa del periodo
   *  orbitale del pianeta (indipendente dalla velocità di simulazione). */
  trailFractions: [0.012, 0.024, 0.038] as number[],
};

/** Velocità angolare media della Terra in gradi/secondo di simulazione a 1x. */
export const EARTH_DEG_PER_SIM_SEC = 360 / CONFIG.earthYearSimSeconds;
