/**
 * S15 · R2 — Test per `textureUrl` (tier albedo 2K/4K con fallback).
 *
 * Contratto:
 *  - hiRes=false → sempre `/textures/planets/<name>.jpg` (mobile)
 *  - hiRes=true  → variante 4K dal manifest generato a build **se presente**,
 *    altrimenti fallback 2K (mai URL inesistenti → mai 404 in scena)
 *  - case-insensitive sul nome del corpo
 */
import { describe, it, expect } from 'vitest';
import { textureUrl, NORMAL_MAPS, BODIES_3D } from './bodies3d';
import hiResManifest from '../generated/hiResTextures.json';

describe('textureUrl', () => {
  it('hiRes=false → sempre 2K per tutti i corpi', () => {
    for (const n of BODIES_ORDER_2K()) {
      expect(textureUrl(n, false)).toBe(`/textures/planets/${n.toLowerCase()}.jpg`);
    }
  });

  it('hiRes=true → 4K per i corpi presenti nel manifest (URL = BASE_URL + path relativo)', () => {
    for (const [key, url] of Object.entries(hiResManifest)) {
      const body = key.charAt(0).toUpperCase() + key.slice(1);
      expect(textureUrl(body, true)).toBe(`${import.meta.env.BASE_URL}${url}`);
    }
  });

  it('hiRes=true → fallback 2K per i corpi ASSENTI dal manifest (mai 404)', () => {
    const manifestKeys = new Set(Object.keys(hiResManifest));
    for (const n of BODIES_ORDER_2K()) {
      if (!manifestKeys.has(n.toLowerCase())) {
        expect(textureUrl(n, true)).toBe(`/textures/planets/${n.toLowerCase()}.jpg`);
      }
    }
  });

  it('case-insensitive', () => {
    expect(textureUrl('EARTH', true)).toBe(textureUrl('earth', true));
    expect(textureUrl('EARTH', false)).toBe('/textures/planets/earth.jpg');
  });

  it('il manifest contiene solo corpi con texture 2K corrispondenti (niente chiavi orfane)', () => {
    for (const key of Object.keys(hiResManifest)) {
      const body = key.charAt(0).toUpperCase() + key.slice(1);
      expect(BODIES_3D[body], `${body} deve esistere in BODIES_3D`).toBeDefined();
    }
  });
});

describe('NORMAL_MAPS (R2)', () => {
  it('la Terra ha una normal map 2K', () => {
    expect(NORMAL_MAPS.Earth).toBe('/textures/planets/normal/earth_normal_2048.jpg');
  });
});

function BODIES_ORDER_2K(): string[] {
  // Tutti i corpi con albedo (il Sole incluso: ha la sua texture ma non
  // passa da textureUrl in Bodies — qui verifichiamo solo il mapping).
  return ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
}
