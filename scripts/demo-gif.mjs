/**
 * Genera `docs/images/demo.gif` — GIF animata (~15s) del simulatore
 * per la hero del README.
 *
 * Cosa fa:
 *  1. Apre la build di preview (default http://localhost:4173/)
 *  2. Attende l'intro cinematografica, alza la velocità di simulazione
 *  3. Avvia il "🎬 Tour" guidato (panoramica → Terra → Saturno)
 *  4. Registra un video WebM e lo converte in GIF con ffmpeg
 *     (palette generata dal video → dithering di qualità)
 *
 * Uso:
 *   npm run build && npm run preview &     # serve dist/ su :4173
 *   node scripts/demo-gif.mjs [URL]
 *
 * Opzionale: passare l'URL di una build con base custom, es.
 *   node scripts/demo-gif.mjs http://localhost:4173/Demo-Interattiva-Sistema-Solare/
 *
 * Richiede: playwright (chromium) e ffmpeg nel PATH.
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const URL = process.argv[2] || 'http://localhost:4173/';
const OUT_GIF = 'docs/images/demo.gif';
const WORK_DIR = join(tmpdir(), 'kilo', 'demo-gif');
const VIEWPORT = { width: 1280, height: 720 };
const TOUR_SECONDS = 16; // durata della registrazione del tour

function fail(msg) {
  console.error(`[demo-gif] ${msg}`);
  process.exit(1);
}

if (!existsSync('node_modules/playwright')) {
  fail('playwright non installato: npm i -D playwright && npx playwright install chromium');
}
if (spawnSync('ffmpeg', ['-version'], { shell: process.platform === 'win32' }).status !== 0) {
  fail('ffmpeg non trovato nel PATH (serve per WebM → GIF)');
}

rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });
mkdirSync('docs/images', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  recordVideo: { dir: WORK_DIR, size: VIEWPORT },
});

const page = await context.newPage();
const failedRequests = [];
const consoleErrors = [];
page.on('requestfailed', (req) => failedRequests.push(`${req.url()} → ${req.failure()?.errorText}`));
page.on('response', (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.url()} → HTTP ${res.status()}`);
});
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

console.log(`[demo-gif] apro ${URL}`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForSelector('canvas', { state: 'visible', timeout: 30_000 });

// Intro cinematografica (~3s) + caricamento texture
await page.waitForTimeout(4500);

// Alza la velocità di simulazione (→ cambia i preset 1x → 2x → 5x → 10x)
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(800);

// Avvia il tour guidato (panoramica → Terra → Saturno): il chip "🎬 Tour"
// vive nel menu overflow "⋯" (aria-label "Altre opzioni").
let tourStarted = false;
const moreBtn = page.getByRole('button', { name: /Altre opzioni|More options/i }).first();
if (await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await moreBtn.click();
  const tourItem = page.getByRole('menuitem', { name: /Tour/i }).first();
  await tourItem.click({ timeout: 5000 });
  tourStarted = true;
  console.log(`[demo-gif] tour avviato, registro ${TOUR_SECONDS}s…`);
}
if (!tourStarted) {
  console.log('[demo-gif] menu Tour non trovato: registro la scena libera');
}
await page.waitForTimeout(TOUR_SECONDS * 1000);

await context.close(); // finalizza il video
await browser.close();

const webm = readdirSync(WORK_DIR).find((f) => f.endsWith('.webm'));
if (!webm) fail('nessun video registrato');
const webmPath = join(WORK_DIR, webm);

// WebM → GIF: salta i primi 2s (caricamento), 15s totali, fps 8,
// larghezza 720px, palette generata dal video (dithering bayer leggero)
console.log('[demo-gif] converto in GIF con ffmpeg…');
const ff = spawnSync(
  'ffmpeg',
  [
    '-y', '-ss', '2', '-t', '15', '-i', webmPath,
    '-vf', 'fps=8,scale=720:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    '-loop', '0',
    OUT_GIF,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] }
);
if (ff.status !== 0) fail('conversione ffmpeg fallita');

const sizeMb = (existsSync(OUT_GIF) ? statSync(OUT_GIF).size : 0) / 1024 / 1024;
console.log(`[demo-gif] scritto ${OUT_GIF} (${sizeMb.toFixed(1)} MB)`);

// Diagnostica deploy: 4xx/5xx o errori console invalidano il build
if (failedRequests.length) {
  console.error(`[demo-gif] ATTENZIONE — richieste fallite:\n  ${failedRequests.join('\n  ')}`);
  process.exit(2);
}
if (consoleErrors.length) {
  console.error(`[demo-gif] ATTENZIONE — errori console:\n  ${consoleErrors.join('\n  ')}`);
  process.exit(2);
}
console.log('[demo-gif] OK: 0 richieste fallite, 0 errori console');
