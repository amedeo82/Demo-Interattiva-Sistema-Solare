/**
 * S15 · M7 — Layer i18n leggero.
 *
 * - `t(key, vars?)`: funzione pura che legge il locale corrente dallo
 *   store (utile fuori dai componenti, es. `paletteCommands` in App).
 * - `useT()`: hook che si sottoscrive al locale e restituisce una
 *   traduttore memoizzato — i componenti che lo usano si ri-renderizzano
 *   al cambio lingua.
 * - fallback: chiave assente nel locale corrente → `it` → chiave grezza
 *   (con warning in dev).
 * - persistenza: `PREFS_KEYS.lang` in localStorage ('it' default).
 * - `localeTag()` per `toLocaleDateString` (it-IT / en-US).
 */
import { useCallback } from 'react';
import { create } from 'zustand';
import { dict, type Locale } from './dict';
import { PREFS_KEYS } from '../utils/prefs';

export type { Locale };

function loadLocale(): Locale {
  try {
    return localStorage.getItem(PREFS_KEYS.lang) === 'en' ? 'en' : 'it';
  } catch {
    return 'it';
  }
}

interface I18nStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useI18nStore = create<I18nStore>((set) => ({
  locale: loadLocale(),
  setLocale: (l) => {
    try {
      localStorage.setItem(PREFS_KEYS.lang, l);
    } catch {
      /* storage non disponibile: locale solo di sessione */
    }
    set({ locale: l });
  },
}));

/** Locale corrente (per `t` fuori dai componenti). */
export function getLocale(): Locale {
  return useI18nStore.getState().locale;
}

/** Toggle it ↔ en (chip lingua). */
export function toggleLocale(): Locale {
  const next = getLocale() === 'it' ? 'en' : 'it';
  useI18nStore.getState().setLocale(next);
  return next;
}

/** BCP-47 tag per `Intl`/`toLocaleDateString` in base al locale. */
export function localeTag(locale: Locale = getLocale()): string {
  return locale === 'en' ? 'en-US' : 'it-IT';
}

export type Vars = Record<string, string | number>;

function translate(locale: Locale, key: string, vars?: Vars): string {
  let s = dict[locale][key] ?? dict.it[key];
  if (s === undefined) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] chiave mancante: "${key}"`);
    }
    return key;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // split/join invece di replaceAll: il progetto compila con lib ES2020.
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** Traduttore imperativo (usa il locale corrente dello store). */
export function t(key: string, vars?: Vars): string {
  return translate(getLocale(), key, vars);
}

/** Hook reattivo: ri-renderizza il componente al cambio lingua. */
export function useT(): (key: string, vars?: Vars) => string {
  const locale = useI18nStore((s) => s.locale);
  return useCallback((key: string, vars?: Vars) => translate(locale, key, vars), [locale]);
}
