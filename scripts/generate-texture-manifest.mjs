#!/usr/bin/env node
/**
 * S15 · R2 — Genera il manifest delle texture "hero" ad alta risoluzione.
 *
 * Scansiona `public/textures/planets/4k/*.jpg` e scrive
 * `src/generated/hiResTextures.json` con la mappa
 * `{ "<basename>": "/textures/planets/4k/<basename>.jpg" }`.
 *
 * Perché: gli asset 4K (CC-BY Solar System Scope) NON sono ridistribuibili
 * via CDN (403 su download diretto), quindi non vengono committati qui.
 * Questo script rende l'upgrade **automatico**: chiunque scarichi i file
 * 4K e li depositi in `public/textures/planets/4k/` (es. `earth.jpg`,
 * `mars.jpg`, `jupiter.jpg`, `saturn.jpg`) ottiene l'attivazione al prossimo
 * `npm run build`, senza toccare codice. Se la cartella è vuota il loader
 * ricade sulle 2K esistenti (fallback in `bodies3d.ts` → `textureUrl`).
 *
 * Idempotente e deterministico (output ordinato). Lanciato dall'hook npm
 * `prebuild` (che npm esegue automaticamente prima di `build`).
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HI_RES_DIR = join(ROOT, 'public', 'textures', 'planets', '4k');
const OUT_DIR = join(ROOT, 'src', 'generated');
const OUT_FILE = join(OUT_DIR, 'hiResTextures.json');

function main() {
  /** @type {Record<string, string>} */
  const manifest = {};
  if (existsSync(HI_RES_DIR)) {
    for (const f of readdirSync(HI_RES_DIR)) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      const key = basename(f, extname(f)).toLowerCase();
      // Percorso relativo alla root di public/ (portabile su GitHub Pages):
      // textureUrl() lo prefissa con import.meta.env.BASE_URL a runtime.
      manifest[key] = `textures/planets/4k/${f}`;
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  // Ordina le chiavi per output deterministico (diff stabile in git).
  // NB: JSON puro, senza commenti — viene importato da Vite/TS.
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  const keys = Object.keys(sorted);
  console.log(
    `[texture-manifest] ${keys.length} texture hi-res: ${keys.length ? keys.join(', ') : '(nessuna — fallback 2K)'}`
  );
}

main();
