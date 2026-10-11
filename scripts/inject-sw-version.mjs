#!/usr/bin/env node
/**
 * Sostituisce il placeholder `__BUILD_HASH__` in dist/sw.js con uno
 * sha256 troncato dei file generati in dist/assets, in modo che ad ogni
 * build la cache PWA venga invalidata automaticamente (vedi step 1.4
 * del piano in docs/ROADMAP.md).
 *
 * Idempotente: se il placeholder è già stato sostituito (build
 * consecutiva senza modifiche) l'hash è stabile.
 *
 * Esce con codice 0 anche se dist/sw.js non esiste (utile in CI per
 * build di libreria o per `vite build` prima della copia del service
 * worker — non dovrebbe accadere, ma è tollerante).
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const PLACEHOLDER = '__BUILD_HASH__';
const SW_PATH = 'dist/sw.js';
const ASSETS_DIR = 'dist/assets';
const HASH_LEN = 8;
const DEV_FALLBACK = 'dev';

async function listAssetFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listAssetFiles(p)));
    } else if (e.isFile()) {
      out.push(p);
    }
  }
  return out;
}

async function computeHash() {
  const files = await listAssetFiles(ASSETS_DIR);
  if (files.length === 0) {
    return DEV_FALLBACK;
  }
  // Ordina per path per stabilità fra run
  files.sort();
  const h = createHash('sha256');
  for (const f of files) {
    const st = await stat(f);
    // includi path relativo + size + mtime per rilevare cambi di contenuto
    // anche se il file ha lo stesso nome (es. cache busting assente)
    h.update(relative(process.cwd(), f));
    h.update('\0');
    h.update(String(st.size));
    h.update('\0');
    h.update(String(Math.floor(st.mtimeMs)));
    h.update('\n');
  }
  return h.digest('hex').slice(0, HASH_LEN);
}

async function main() {
  if (!existsSync(SW_PATH)) {
    console.warn(`[inject-sw-version] ${SW_PATH} non trovato, skip.`);
    return;
  }
  const hash = await computeHash();
  const cacheName = hash === DEV_FALLBACK ? `solarsys-${DEV_FALLBACK}` : `solarsys-${hash}`;
  const sw = await readFile(SW_PATH, 'utf8');
  const occurrences = sw.split(PLACEHOLDER).length - 1;
  if (occurrences < 1) {
    console.warn(
      `[inject-sw-version] placeholder ${PLACEHOLDER} non trovato in ${SW_PATH} (già sostituito?).`
    );
    return;
  }
  const value = hash === DEV_FALLBACK ? DEV_FALLBACK : hash;
  // Sostituisce TUTTE le occorrenze (commento + dichiarazione const).
  // Usare una regex globale con escape dei caratteri speciali del placeholder.
  const placeholderRegex = new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const updated = sw.replace(placeholderRegex, value);
  // Sanity check: dopo la sostituzione, `const CACHE_NAME` deve contenere il valore.
  if (!updated.includes(`const CACHE_NAME = 'solarsys-${value}'`)) {
    console.error(
      `[inject-sw-version] ERRORE: la dichiarazione const CACHE_NAME non è stata aggiornata. ` +
        `Occorrenze placeholder trovate: ${occurrences}. File: ${SW_PATH}`
    );
    process.exit(1);
  }
  writeFileSync(SW_PATH, updated, 'utf8');
  console.log(`[inject-sw-version] CACHE_NAME → ${cacheName}`);
}

main().catch((err) => {
  console.error('[inject-sw-version] errore:', err);
  process.exit(1);
});
