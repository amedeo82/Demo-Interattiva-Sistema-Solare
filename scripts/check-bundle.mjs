#!/usr/bin/env node
/**
 * S10a · M6b — Verifica budget di dimensione del bundle.
 *
 * Legge i chunk emessi da Vite in `dist/assets/*.js`, calcola la
 * dimensione gzip e confronta con soglie definite in `bundle.config.mjs`.
 * Stampa una tabella Markdown e fallisce (exit 1) se una soglia è
 * sforata. Nessuna dipendenza esterna: solo `node:zlib` e `node:fs`.
 *
 * Uso: `node scripts/check-bundle.mjs` (chiamato dal workflow CI dopo
 * lo step di build). Le soglie sono intenzionalmente generose: un
 * PR che le sfora merita un'occhiata, non un blocco automatico. Dopo
 * 2 sprint di calibrazione, le soglie possono essere abbassate.
 */
import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS_DIR = join(ROOT, 'dist', 'assets');

/** Soglie gzip in KB. Modificabili in `bundle.config.mjs`. */
const DEFAULT_BUDGETS = {
  main: 25, // index-*.js
  'solar-scene': 15, // SolarScene-*.js (chunk lazy)
  'drei-vendor': 170, // drei-vendor-*.js
  'three-vendor': 200, // three-vendor-*.js (separato in S7)
  total: 320, // somma di tutti i chunk JS gzip
};

async function loadBudgets() {
  const configPath = join(ROOT, 'bundle.config.mjs');
  if (!existsSync(configPath)) return DEFAULT_BUDGETS;
  try {
    const mod = await import(pathToFileURL(configPath).href);
    return { ...DEFAULT_BUDGETS, ...(mod.default ?? {}) };
  } catch (err) {
    console.warn(`[check-bundle] impossibile caricare bundle.config.mjs: ${err.message}`);
    return DEFAULT_BUDGETS;
  }
}

async function listJs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => join(dir, e.name));
}

function classify(name) {
  if (name.startsWith('index-')) return 'main';
  if (name.startsWith('SolarScene-')) return 'solar-scene';
  if (name.startsWith('drei-vendor-')) return 'drei-vendor';
  if (name.startsWith('three-vendor-')) return 'three-vendor';
  return 'main';
}

function fmtKb(bytes) {
  return (bytes / 1024).toFixed(2);
}

async function main() {
  if (!existsSync(ASSETS_DIR)) {
    console.error(
      `[check-bundle] ${ASSETS_DIR} non trovato. Esegui prima 'npm run build'.`
    );
    process.exit(1);
  }
  const budgets = await loadBudgets();
  const files = await listJs(ASSETS_DIR);
  const rows = [];
  const perCat = { main: 0, 'solar-scene': 0, 'drei-vendor': 0, 'three-vendor': 0 };
  let totalGzip = 0;

  for (const f of files) {
    const raw = await readFile(f);
    const gz = gzipSync(raw, { level: 9 });
    const cat = classify(f.split(/[/\\]/).pop());
    perCat[cat] = (perCat[cat] ?? 0) + gz.length;
    totalGzip += gz.length;
    rows.push({
      name: f.split(/[/\\]/).pop(),
      category: cat,
      raw: raw.length,
      gzip: gz.length,
    });
  }

  // Tabella
  console.log('| File | Categoria | Raw (KB) | Gzip (KB) |');
  console.log('|---|---|---:|---:|');
  for (const r of rows) {
    console.log(`| ${r.name} | ${r.category} | ${fmtKb(r.raw)} | ${fmtKb(r.gzip)} |`);
  }
  console.log('');
  console.log('| Categoria | Gzip (KB) | Budget (KB) | OK |');
  console.log('|---|---:|---:|:-:|');
  let failed = 0;
  for (const cat of Object.keys(budgets)) {
    if (cat === 'total') continue;
    const used = perCat[cat] ?? 0;
    const usedKb = used / 1024;
    const budget = budgets[cat];
    const ok = usedKb <= budget;
    if (!ok) failed++;
    console.log(`| ${cat} | ${usedKb.toFixed(2)} | ${budget} | ${ok ? '✓' : '✗'} |`);
  }
  const totalKb = totalGzip / 1024;
  const totalOk = totalKb <= budgets.total;
  if (!totalOk) failed++;
  console.log(
    `| total | ${totalKb.toFixed(2)} | ${budgets.total} | ${totalOk ? '✓' : '✗'} |`
  );

  if (failed > 0) {
    console.error(
      `\n[check-bundle] ${failed} soglia/e superata/e. Aggiorna bundle.config.mjs o ottimizza il bundle.`
    );
    process.exit(1);
  }
  console.log('\n[check-bundle] OK: tutte le soglie rispettate.');
}

main().catch((err) => {
  console.error('[check-bundle] errore:', err);
  process.exit(1);
});
