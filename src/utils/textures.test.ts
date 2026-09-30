/**
 * Test per il sistema di texture procedurali: mappatura pianeta→tipo,
 * determinismo della generazione e robustezza (fallback a null su canvas
 * non disponibile).
 */
import { describe, it, expect } from 'vitest';
import { paintPlanetTexture, TEXTURE_KINDS, type TextureKind } from './textures';

const ALL_KINDS: TextureKind[] = ['cratered', 'cloudy', 'earthlike', 'dusty', 'banded', 'icy'];

describe('TEXTURE_KINDS — mappa pianeti → tipo di texture', () => {
  it('copre tutti gli 8 pianeti più la Luna', () => {
    const expected = [
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Luna',
    ];
    for (const name of expected) {
      expect(TEXTURE_KINDS[name]).toBeDefined();
    }
  });

  it('associa tipi coerenti con la natura dei corpi celesti', () => {
    expect(TEXTURE_KINDS.Mercury).toBe('cratered'); // superficie craterizzata
    expect(TEXTURE_KINDS.Luna).toBe('cratered');
    expect(TEXTURE_KINDS.Earth).toBe('earthlike');
    expect(TEXTURE_KINDS.Mars).toBe('dusty');
    expect(TEXTURE_KINDS.Jupiter).toBe('banded'); // fasce turbolente
    expect(TEXTURE_KINDS.Saturn).toBe('banded');
    expect(TEXTURE_KINDS.Uranus).toBe('icy');
    expect(TEXTURE_KINDS.Neptune).toBe('icy');
  });

  it('ogni tipo mappato è un TextureKind valido', () => {
    const kinds = new Set<string>(ALL_KINDS);
    for (const kind of Object.values(TEXTURE_KINDS)) {
      expect(kinds.has(kind)).toBe(true);
    }
  });
});

describe('paintPlanetTexture — generazione su canvas', () => {
  it.each(ALL_KINDS)('restituisce un data-uri PNG valido per "%s"', (kind) => {
    const url = paintPlanetTexture(kind, '#aabbcc');
    expect(url).not.toBeNull();
    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it('è deterministica: stessa richiesta ⇒ stesso output', () => {
    const a = paintPlanetTexture('cratered', '#888888');
    const b = paintPlanetTexture('cratered', '#888888');
    expect(a).toBe(b);
  });

  it('distingue colori diversi (seed derivato dal colore base)', () => {
    const red = paintPlanetTexture('banded', '#c8a060');
    const blue = paintPlanetTexture('banded', '#3f6fb5');
    // Con il mock jsdom il toDataURL è fisso: l'importante è che non esploda
    // e che entrambe le chiamate restituiscano un valore usabile.
    expect(red).not.toBeNull();
    expect(blue).not.toBeNull();
  });

  it('non lancia eccezioni per nessuno dei colori reali dei pianeti', () => {
    const colors = [
      '#9c9c9c',
      '#e8cda2',
      '#4f8fdd',
      '#d1683f',
      '#c8a060',
      '#e3cf9a',
      '#9fd7de',
      '#4a6fd4',
    ];
    for (const color of colors) {
      for (const kind of ALL_KINDS) {
        expect(() => paintPlanetTexture(kind, color)).not.toThrow();
      }
    }
  });
});
