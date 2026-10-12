/**
 * S11 · F1 — Test per deep link encode/decode.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDeepLink, encodeDeepLink, createHashWriter, type DeepLinkState } from './deepLink';

describe('parseDeepLink', () => {
  it('hash vuoto → stato di default', () => {
    const s = parseDeepLink('');
    expect(s.planetKey).toBeNull();
    expect(s.date).toBeNull();
    expect(s.speed).toBeNull();
    expect(s.toggles.size).toBe(0);
  });

  it('hash non valido → null ovunque', () => {
    expect(parseDeepLink(null).planetKey).toBeNull();
    expect(parseDeepLink(undefined).planetKey).toBeNull();
  });

  it('parse pianeta valido', () => {
    expect(parseDeepLink('#p=Jupiter').planetKey).toBe('Jupiter');
    expect(parseDeepLink('p=Mercury').planetKey).toBe('Mercury');
  });

  it('parse pianeta invalido → null', () => {
    expect(parseDeepLink('#p=Plutone').planetKey).toBeNull();
  });

  it('parse data ISO valida', () => {
    expect(parseDeepLink('#d=2027-03-12').date).toBe('2027-03-12');
  });

  it('parse data invalida → null', () => {
    expect(parseDeepLink('#d=2027-13-99').date).toBeNull();
    expect(parseDeepLink('#d=2027/03/12').date).toBeNull();
  });

  it('parse velocità valida', () => {
    expect(parseDeepLink('#v=2.5').speed).toBe(2.5);
  });

  it('parse velocità fuori range → null', () => {
    expect(parseDeepLink('#v=0.01').speed).toBeNull();
    expect(parseDeepLink('#v=21').speed).toBeNull();
  });

  it('parse toggles', () => {
    const s = parseDeepLink('#t=labels,realism,fx');
    expect(s.toggles.has('labels')).toBe(true);
    expect(s.toggles.has('realism')).toBe(true);
    expect(s.toggles.has('fx')).toBe(true);
    expect(s.toggles.has('eclipses')).toBe(false);
  });

  it('ignora toggle invalidi', () => {
    const s = parseDeepLink('#t=labels,bogus,fx');
    expect(s.toggles.size).toBe(2);
  });

  it('round-trip encode/decode', () => {
    const orig: DeepLinkState = {
      planetKey: 'Mars',
      date: '2025-01-16',
      speed: 5,
      toggles: new Set(['labels', 'realism']),
    };
    const hash = encodeDeepLink(orig);
    expect(hash).toMatch(/^#/);
    const parsed = parseDeepLink(hash);
    expect(parsed.planetKey).toBe('Mars');
    expect(parsed.date).toBe('2025-01-16');
    expect(parsed.speed).toBe(5);
    expect(parsed.toggles).toEqual(new Set(['labels', 'realism']));
  });
});

describe('createHashWriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock history.replaceState
    window.history.replaceState = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounce 300ms', () => {
    const push = createHashWriter(300);
    const state: DeepLinkState = {
      planetKey: 'Earth',
      date: null,
      speed: null,
      toggles: new Set(),
    };
    push(state);
    push(state);
    push(state);
    expect(window.history.replaceState).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
  });

  it("non scrive se l'hash è già uguale", () => {
    // Simula hash già presente
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '#p=Earth' },
      configurable: true,
    });
    const push = createHashWriter(0);
    const state: DeepLinkState = {
      planetKey: 'Earth',
      date: null,
      speed: null,
      toggles: new Set(),
    };
    push(state);
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
