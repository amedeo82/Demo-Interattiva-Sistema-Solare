/**
 * <AmbientAudio /> — drone spaziale sintetizzato via Web Audio API.
 *
 * Niente asset da scaricare: due oscillatori (uno "drone" sinusoidale a 80 Hz
 * e uno "harmonico" a 120 Hz) passano attraverso un LFO (modulazione di
 * ampiezza lenta) e un filtro lowpass + delay feedback per dare l'effetto
 * "cielo profondo". Il volume parte da 0 e sale a 0.08 (molto basso) per
 * non disturbare. L'utente lo attiva esplicitamente con un chip; lo stato
 * è persistito in localStorage come le altre preferenze.
 */
import { useEffect, useRef } from 'react';
import { usePersistentState } from '../utils/prefs';

export default function AmbientAudio() {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    'solarsys.ambient',
    false,
    (v) => typeof v === 'boolean'
  );
  // Refs al grafo audio. Vengono creati lazy al primo enable.
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Disattiva: fade-out e pausa la riproduzione
      const master = masterRef.current;
      if (master && ctxRef.current) {
        const now = ctxRef.current.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.6);
        setTimeout(() => {
          ctxRef.current?.suspend().catch(() => undefined);
        }, 700);
      }
      return;
    }

    // Crea/riprende il contesto
    let ctx = ctxRef.current;
    if (!ctx) {
      // Rispetta la preferenza utente: alcuni browser richiedono un
      // gesto dell'utente per creare AudioContext. Il toggle è già un
      // gesto, quindi la creazione qui funziona.
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      ctxRef.current = ctx;
      buildGraph(ctx);
    } else {
      ctx.resume().catch(() => undefined);
    }

    // Fade-in
    const master = masterRef.current;
    if (master && ctx) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.08, now + 1.2);
    }
  }, [enabled]);

  // Cleanup completo quando il componente smonta
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, []);

  // Esponiamo il toggle via una funzione globale per consentire all'header
  // di controllarlo senza prop-drilling.
  useEffect(() => {
    type WindowWithToggle = Window & { __toggleAmbient?: () => void };
    (window as WindowWithToggle).__toggleAmbient = () => setEnabled((v) => !v);
    return () => {
      delete (window as WindowWithToggle).__toggleAmbient;
    };
  }, [setEnabled]);

  // Aggiorna il dataset del chip in header per riflettere lo stato.
  useEffect(() => {
    const btn = document.querySelector<HTMLButtonElement>('[data-chip="ambient"]');
    if (btn) btn.setAttribute('aria-pressed', String(enabled));
  }, [enabled]);

  return null;

  function buildGraph(ctx: AudioContext) {
    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterRef.current = master;

    // Filtro lowpass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    filter.connect(master);

    // Delay (riverbero sintetico)
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.4;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(filter);

    // Drone base
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 80;
    const g1 = ctx.createGain();
    g1.gain.value = 0.45;
    o1.connect(g1).connect(filter);
    o1.connect(delay);
    o1.start();

    // Armonica
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 120;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o2.connect(g2).connect(filter);
    o2.start();

    // LFO per modulazione di ampiezza lenta
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06; // un ciclo ogni ~16 secondi
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain).connect(g1.gain);
    lfo.start();

    // Shimmer molto lieve (triangolare alta freq)
    const o3 = ctx.createOscillator();
    o3.type = 'triangle';
    o3.frequency.value = 480;
    const g3 = ctx.createGain();
    g3.gain.value = 0.04;
    o3.connect(g3).connect(delay);
    o3.start();
  }
}
