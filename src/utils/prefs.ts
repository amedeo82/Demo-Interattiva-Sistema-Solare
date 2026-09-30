/**
 * Persistenza delle preferenze utente (zoom, velocità, etichette, realismo…)
 * in localStorage, con letture difensive: valori corrotti/assenti → default.
 */
import { useEffect, useState } from 'react';

/** Restituisce un reader/writer "sicuro": se localStorage non è disponibile
 *  (SSR, privacy mode, quota) le operazioni diventano no-op silenziosi. */
function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    // probe write: alcune modalità private lanciano solo alla scrittura
    const k = '__probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function loadJSON<T>(key: string, fallback: T, validate?: (v: unknown) => boolean): T {
  const raw = safeStorage()?.getItem(key);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    if (validate && !validate(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    safeStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // quota o storage non disponibile: la preferenza resta solo in memoria
  }
}

/** Hook "lazy init" per uno stato persistito: legge da localStorage alla
 *  prima render (con validazione) e riscrive a ogni cambiamento. */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  validate?: (v: unknown) => boolean
): [T, React.Dispatch<React.SetStateAction<T>>] {
  return useState<T>(() => loadJSON(key, fallback, validate));
}

/** Chiavi di persistenza condivise fra App e componenti. */
export const PREFS_KEYS = {
  speed: 'solarsys.speed',
  showLabels: 'solarsys.showLabels',
  realistic: 'solarsys.realistic',
} as const;
