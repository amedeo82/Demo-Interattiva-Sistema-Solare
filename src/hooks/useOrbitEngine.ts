/**
 * Motore di animazione basato su requestAnimationFrame.
 *
 * Rispetto alle animazioni CSS (che si "resettano" cambiando durata o
 * pausando), questo motore mantiene una simulazione continua con tempo
 * accumulato: pause, cambi di velocità e ri-render non causano scatti.
 *
 * Architettura (rev. 2 — ottimizzazione 60fps): il loop rAF NON chiama più
 * `setState` a ogni frame. Le posizioni sono mutate in un buffer condiviso e
 * propagate agli abbonati (componenti che scrivono direttamente nel DOM via
 * ref imperativi) senza passare dal reconciler React. I consumatori React
 * "lenti" (es. la data nella sidebar) usano `useSimTime`, che pubblica il
 * tempo simulato con throttling (~4 Hz) per limitare i re-render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlanetData } from '../data/planets';
import {
  normalizeDeg,
  orbitalRadiusPx,
  solveKepler,
  trueAnomalyFromEccentric,
} from '../utils/kepler';

export interface SimPlanetState {
  /** Longitudine eliocentrica corrente in gradi (0° = in alto, senso orario). */
  angle: number;
  /** Raggio corrente in px (variabile con l'eccentricità kepleriana). */
  radius: number;
}

export interface SimulationState {
  /** Stato orbitale corrente per ogni pianeta (chiave = planet.name). */
  positions: Record<string, SimPlanetState>;
  /** Tempo simulato accumulato in "secondi a 1x". */
  simTime: number;
}

/** Offset iniziale sfalsato: orbitRadius e periodo sono correlati
 *  (3ª legge di Keplero), quindi tutti partirebbero allineati in cima. */
const START_ANGLES: Record<string, number> = {
  Mercury: 40,
  Venus: 160,
  Earth: 300,
  Mars: 95,
  Jupiter: 220,
  Saturn: 15,
  Uranus: 135,
  Neptune: 260,
};

/** Oggetto stabile a livello di modulo, usato come fallback per `anomalies`
 *  quando non è stata scelta una data. DEVE essere a livello modulo: se
 *  fosse dichiarato dentro l'hook sarebbe un oggetto nuovo ad ogni render,
 *  invalidando il `useMemo` di `computeInto` e — più gravemente —
 *  ri-innescando l'effect che resetta `simTimeRef.current = startSimTime`
 *  ad ogni re-render. Il risultato sarebbe l'animazione che "torna
 *  indietro" verso la posizione iniziale ad ogni re-render di App (~4Hz). */
const NO_ANOMALIES: Record<string, number> = {};

/** Velocità angolare media in gradi/secondo di simulazione a speed=1. */
function angularSpeed(planet: PlanetData): number {
  return 360 / planet.animationDuration;
}

/**
 * Posizione kepleriana di un pianeta dato il tempo simulato.
 *
 * Semplificazione: l'asse maggiore di ogni ellisse è allineato con la
 * direzione iniziale del pianeta nel modello ("perielio locale" in
 * corrispondenza di `startAngleDeg`). L'anomalia media avanza a velocità
 * costante dalla fase `meanAnomaly0` (default: perielio della data = 0°
 * rispetto all'asse, comportamento storico); da essa si ricava l'anomalia
 * eccentrica E (equazione di Keplero) e quindi l'anomalia vera ν, che dà la
 * longitudine visibile:
 *
 *     angolo(t) = start + ν(M₀ + 360·t/P_anim − M₀)   con avanzamento medio
 *
 * Il raggio segue l'ellisse polare r(ν) = a(1-e²)/(1+e·cos ν).
 *
 * @param t             tempo simulato (secondi a 1x)
 * @param startAngleDeg longitudine mostrata quando ν = 0 (offset della data)
 * @param meanAnomaly0  anomalia media reale alla data d'inizio (M_data):
 *                      l'avanzamento kepleriano è misurato RELATIVO a essa,
 *                      così all'istante di partenza (t = t₀, con
 *                      360·(t−t₀)/P_anim ≡ 0 mod 360) ν = 0 ESATTO e la
 *                      longitudine in scena coincide con λ_data senza il
 *                      residuo dell'equazione del centro.
 */
export function keplerPosition(
  planet: PlanetData,
  t: number,
  startAngleDeg = START_ANGLES[planet.name] ?? 0,
  meanAnomaly0 = 0
): SimPlanetState {
  const ecc = planet.eccentricity ?? 0;
  const meanAdvance = normalizeDeg(angularSpeed(planet) * t - meanAnomaly0);
  const E = solveKepler(meanAdvance, ecc);
  const nu = trueAnomalyFromEccentric(E, ecc);
  // longitudine visibile = direzione dell'asse + anomalia vera
  const angle = normalizeDeg(startAngleDeg + nu);
  const radius = orbitalRadiusPx(planet.orbitRadius, ecc, nu);
  return { angle, radius };
}

/** Callback invocata a ogni frame dal motore, con buffer e tempo correnti. */
export type FrameListener = (positions: Record<string, SimPlanetState>, t: number) => void;

/** Intervallo minimo (ms) fra due pubblicazioni React del tempo simulato. */
const SIM_TIME_PUBLISH_INTERVAL_MS = 250;

/**
 * Motore di animazione basato su requestAnimationFrame.
 *
 * Rispetto alle animazioni CSS (che si "resettano" cambiando durata o
 * pausando), questo motore mantiene una simulazione continua con tempo
 * accumulato: pause, cambi di velocità e ri-render non causano scatti.
 *
 * Si possono sovrascrivere gli angoli iniziali (es. per una data storica)
 * tramite `initialAngles`: al variare di quest'ultimo la simulazione
 * riparte dagli offset forniti senza perdere il loop rAF.
 *
 * Ritorna:
 * - `subscribeFrames(listener)`: abbonamento a bassissima latenza, invocato
 *   a ogni frame con lo stesso oggetto-buffer (mutato in place). I componenti
 *   che lo usano devono scrivere direttamente nel DOM (ref imperativi), NON
 *   chiamare setState. Restituisce la funzione di unsubscribe.
 * - `useSimTime()`: hook per consumatori React che hanno bisogno del tempo
 *   simulato come stato; aggiornato al massimo ~4 volte al secondo (il valore
 *   è sempre quello corrente al momento della pubblicazione).
 * - `simTimeRef` / `positionsRef`: accesso sincrono (per handler, es. scie).
 */
export function useOrbitEngine(
  planets: PlanetData[],
  isPlaying: boolean,
  speed: number,
  initialAngles?: Record<string, number>,
  startSimTime = 0,
  initialAnomalies?: Record<string, number>
) {
  // Tempo simulato accumulato (secondi a speed=1), sopravvive ai cambi di speed
  const simTimeRef = useRef(startSimTime);
  const lastFrameRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const starts = initialAngles ?? START_ANGLES;
  const anomalies = initialAnomalies ?? NO_ANOMALIES;

  const computeInto = useMemo(() => {
    return (t: number, out: Record<string, SimPlanetState>): Record<string, SimPlanetState> => {
      for (const p of planets) {
        const pos = keplerPosition(p, t, starts[p.name] ?? 0, anomalies[p.name] ?? 0);
        if (out[p.name]) {
          // muta in place: gli abbonati leggono il buffer per riferimento
          out[p.name].angle = pos.angle;
          out[p.name].radius = pos.radius;
        } else {
          out[p.name] = pos;
        }
      }
      return out;
    };
  }, [planets, starts, anomalies]);

  // Buffer stabile delle posizioni: mai sostituito, solo mutato.
  const positionsRef = useRef<Record<string, SimPlanetState>>({});
  computeInto(simTimeRef.current, positionsRef.current);

  const listenersRef = useRef(new Set<FrameListener>());
  const subscribeFrames = useCallback((listener: FrameListener) => {
    listenersRef.current.add(listener);
    // Subito allineato allo stato corrente (pausa, prima selezione, ecc.)
    listener(positionsRef.current, simTimeRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const emitImpl = () => {
    for (const l of listenersRef.current) l(positionsRef.current, simTimeRef.current);
  };
  // Latest-ref pattern: gli effetti sotto leggono sempre l'ultima chiusura,
  // senza che l'identità della funzione entri nelle deps (stabilità garantita).
  const emitRef = useRef(emitImpl);
  emitRef.current = emitImpl;

  // Stato throttled del tempo simulato per i consumatori React.
  const [simTime, setSimTime] = useState(simTimeRef.current);
  const lastPublishRef = useRef(0);
  const publishSimTimeImpl = (force = false) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (force || now - lastPublishRef.current >= SIM_TIME_PUBLISH_INTERVAL_MS) {
      lastPublishRef.current = now;
      setSimTime(simTimeRef.current);
    }
  };
  const publishSimTimeRef = useRef(publishSimTimeImpl);
  publishSimTimeRef.current = publishSimTimeImpl;

  // Quando cambia l'epoca di partenza (es. selezione di una data), riposiziona
  // la simulazione sul tempo corrispondente e ri-calcola subito le posizioni.
  useEffect(() => {
    simTimeRef.current = startSimTime;
    computeInto(startSimTime, positionsRef.current);
    emitRef.current();
    publishSimTimeRef.current(true);
  }, [startSimTime, computeInto]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      publishSimTimeRef.current(true);
      return;
    }
    let rafId = 0;
    const tick = (now: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = now;
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.1); // clamp tab-inattivo
      lastFrameRef.current = now;
      simTimeRef.current += dt * speedRef.current;
      computeInto(simTimeRef.current, positionsRef.current);
      emitRef.current(); // ← nessun setState: il reconciler React non lavora a 60fps
      publishSimTimeRef.current();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, computeInto]);

  const useSimTime = () => simTime;

  return { subscribeFrames, useSimTime, simTimeRef, positionsRef };
}

/**
 * Hook ausiliario: abbona un componente al flusso di frame del motore.
 * La callback riceve lo stesso buffer `positions` mutato in place — usarla
 * SOLO per scritture DOM dirette (style.transform, attribute set), mai per
 * setState. La callback può cambiare a ogni render (viene letta da ref).
 */
export function useFrameSubscription(
  subscribeFrames: (l: FrameListener) => () => void,
  onFrame: FrameListener
) {
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;
  useEffect(() => subscribeFrames((p, t) => cbRef.current(p, t)), [subscribeFrames]);
}
