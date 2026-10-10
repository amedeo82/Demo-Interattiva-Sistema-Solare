/**
 * <OnboardingTip /> — piccolo tooltip che appare al primo avvio, dopo
 * l'intro, per suggerire le interazioni principali. Persistente in
 * localStorage: una volta chiuso non ricompare finché l'utente non
 * resetta le preferenze.
 */
import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/prefs';

const STORAGE_KEY = 'solarsys.onboarded';

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (loadJSON<boolean>(STORAGE_KEY, false)) return;
    setVisible(true);
  }, [show]);

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
    >
      <div>{text}</div>
      <button className="onboard-tip-close" onClick={dismiss} aria-label="Chiudi suggerimento">
        ✨ Ho capito
      </button>
    </div>
  );
}

export const ONBOARDING_KEY = STORAGE_KEY;
