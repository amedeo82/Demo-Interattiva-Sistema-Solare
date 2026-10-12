/**
 * S14 · F7 — Narrazione TTS dei facts del pianeta (Web Speech API).
 *
 * - Feature-detect: se `speechSynthesis` non esiste (o non ci sono voci),
 *   l'hook è un no-op e il componente nasconde il bottone.
 * - Solo su gesto utente (il bottone è il trigger); mai auto-play.
 * - Cambio testo o unmount → `cancel()` immediato (niente voci sovrapposte).
 * - pubblica `narrationActive` nello store UI per il ducking di AmbientAudio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../store/ui';

/** True se il browser supporta la sintesi vocale. */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function useNarration(text: string | null): {
  speaking: boolean;
  toggle: () => void;
  stop: () => void;
  supported: boolean;
} {
  const supported = isSpeechSupported();
  const [speaking, setSpeaking] = useState(false);
  const setNarrationActive = useUiStore((s) => s.setNarrationActive);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setNarrationActive(false);
  }, [supported, setNarrationActive]);

  const speak = useCallback(
    (t: string) => {
      if (!supported) return;
      // Annulla qualsiasi lettura in corso prima di ripartire
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'it-IT';
      // Preferisci una voce italiana se disponibile
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('it'));
      if (itVoice) u.voice = itVoice;
      u.rate = 1;
      u.onend = () => {
        setSpeaking(false);
        setNarrationActive(false);
        utteranceRef.current = null;
      };
      u.onerror = () => {
        setSpeaking(false);
        setNarrationActive(false);
        utteranceRef.current = null;
      };
      utteranceRef.current = u;
      setSpeaking(true);
      setNarrationActive(true);
      window.speechSynthesis.speak(u);
    },
    [supported, setNarrationActive]
  );

  const toggle = useCallback(() => {
    if (speaking) {
      stop();
    } else if (text) {
      speak(text);
    }
  }, [speaking, text, speak, stop]);

  // Cambio testo (pianeta diverso) → stop immediato
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Unmount → stop
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { speaking, toggle, stop, supported };
}
