/**
 * <OnboardingTip /> — piccolo tooltip che appare al primo avvio, dopo
 * l'intro, per suggerire le interazioni principali. Persistente in
 * localStorage: una volta chiuso non ricompare finché l'utente non
 * resetta le preferenze.
 *
 * S15 — auto-dismiss dopo 7s per ridurre l'occupazione visiva (l'utente
 * può comunque chiuderlo subito col bottone "Ho capito"). Se l'utente
 * passa il mouse sopra, il timer si mette in pausa (interazione > lettura).
 */
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { loadJSON, saveJSON } from '../utils/prefs';

const STORAGE_KEY = 'solarsys.onboarded';
const AUTO_DISMISS_MS = 7000;

export interface OnboardingTipProps {
  /** Mostra il tip. Default true. */
  show?: boolean;
  /** Testo del suggerimento. */
  text: string;
  /** Lato del puntatore (top/right/left). */
  side?: 'top' | 'right' | 'left';
  /** Posizione (top/left/bottom in % o px dal container parent). */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  onDismiss?: () => void;
}

export function OnboardingTip({
  show = true,
  text,
  side = 'top',
  top,
  left,
  right,
  bottom,
  onDismiss,
}: OnboardingTipProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) return;
    if (loadJSON<boolean>(STORAGE_KEY, false)) return;
    setVisible(true);
  }, [show]);

  // Auto-dismiss dopo AUTO_DISMISS_MS, in pausa se l'utente sta leggendo
  // (mouse sopra). Il timer si resetta al passaggio hover ↔ leave.
  useEffect(() => {
    if (!visible || hovered) return;
    autoTimerRef.current = setTimeout(() => {
      saveJSON(STORAGE_KEY, true);
      setVisible(false);
      onDismiss?.();
    }, AUTO_DISMISS_MS);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [visible, hovered, onDismiss]);

  if (!visible) return null;

  const dismiss = () => {
    saveJSON(STORAGE_KEY, true);
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className="onboard-tip pointer-events-auto"
      data-side={side}
      style={{ top, left, right, bottom }}
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div>{text}</div>
      <button className="onboard-tip-close" onClick={dismiss} aria-label={t('onboarding.close')}>
        {t('onboarding.dismiss')}
      </button>
    </div>
  );
}

export const ONBOARDING_KEY = STORAGE_KEY;
