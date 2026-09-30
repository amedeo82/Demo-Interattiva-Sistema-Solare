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
};
