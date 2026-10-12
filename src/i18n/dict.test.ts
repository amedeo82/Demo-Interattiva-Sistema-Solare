/**
 * S15 · M7 — Test per il layer i18n.
 *
 * Contratti:
 *  - parità chiavi it/en (nessuna chiave mancante in una delle due lingue)
 *  - `t()` usa il locale corrente; chiave del tutto assente → chiave grezza
 *    (con warning in dev)
 *  - interpolazione `{var}` via `t(key, vars)`
 *  - `toggleLocale()` alterna it↔en e persiste in localStorage
 *  - `localeTag()` restituisce it-IT / en-US
 *  - default: 'it' (garantisce che la suite esistente veda stringhe italiane)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IT_KEYS, dict } from './dict';
import { t, useT, getLocale, toggleLocale, localeTag, useI18nStore } from './index';

function setL(l: 'it' | 'en'): void {
  useI18nStore.getState().setLocale(l);
}

describe('dict — parità chiavi', () => {
  it('ogni chiave `it` esiste anche in `en` (e viceversa)', () => {
    const itKeys = Object.keys(dict.it).sort();
    const enKeys = Object.keys(dict.en).sort();
    expect(enKeys).toEqual(itKeys);
  });

  it('nessuna stringa vuota', () => {
    for (const [loc, d] of Object.entries(dict)) {
      for (const [k, v] of Object.entries(d)) {
        expect(v.trim(), `${loc}.${k}`).not.toBe('');
      }
    }
  });

  it('i placeholder {var} sono coerenti fra it ed en', () => {
    const placeholder = (s: string): string[] => (s.match(/\{[a-z]+\}/g) ?? []).sort();
    for (const key of Object.keys(dict.it)) {
      expect(placeholder(dict.en[key]), `key ${key}`).toEqual(placeholder(dict.it[key]));
    }
  });

  it('IT_KEYS copra tutte le chiavi it', () => {
    expect(IT_KEYS.length).toBe(Object.keys(dict.it).length);
  });
});

describe('t / locale store', () => {
  beforeEach(() => {
    setL('it');
  });

  afterEach(() => {
    setL('it');
  });

  it('default è it (le stringhe shell restano italiane per i test esistenti)', () => {
    expect(getLocale()).toBe('it');
    expect(t('chip.today')).toBe('📍 Oggi');
  });

  it('t() cambia lingua con setLocale', () => {
    setL('en');
    expect(t('chip.today')).toBe('📍 Today');
    expect(t('sidebar.planets')).toBe('Planets');
    setL('it');
    expect(t('sidebar.planets')).toBe('Pianeti');
  });

  it('t() con interpolazione {var}', () => {
    expect(t('quiz.question', { n: 2, total: 5 })).toBe('Domanda 2 di 5');
    setL('en');
    expect(t('quiz.question', { n: 2, total: 5 })).toBe('Question 2 of 5');
  });

  it('chiave del tutto assente → chiave grezza + warning in dev', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('chiave.fantasma')).toBe('chiave.fantasma');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('toggleLocale alterna it ↔ en e persiste', () => {
    expect(toggleLocale()).toBe('en');
    expect(localStorage.getItem('solarsys.lang')).toBe('en');
    expect(getLocale()).toBe('en');
    expect(toggleLocale()).toBe('it');
    expect(localStorage.getItem('solarsys.lang')).toBe('it');
  });

  it('localeTag per Intl', () => {
    setL('it');
    expect(localeTag()).toBe('it-IT');
    setL('en');
    expect(localeTag()).toBe('en-US');
  });
});

describe('useT — hook reattivo', () => {
  it('restituisce un traduttore che segue il locale corrente', () => {
    setL('it');
    const { result } = renderHook(() => useT());
    expect(result.current('sidebar.planets')).toBe('Pianeti');
    act(() => {
      setL('en');
    });
    expect(result.current('sidebar.planets')).toBe('Planets');
    setL('it');
  });
});
