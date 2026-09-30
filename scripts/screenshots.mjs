/**
 * Generazione automatica degli screenshot per il README.
 *
 * Usage:
 *   npm run build && npm run preview      (lascia girare il preview server)
 *   node scripts/screenshots.mjs [baseUrl]
 *
 * Richiede `playwright` installato localmente (devDependency temporanea):
 *   npm i -D playwright && npx playwright install chromium --with-deps
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT = path.resolve('docs/images');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const shot = async (name, waitMs = 1800) => {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`✔ docs/images/${name}.png`);
};

// Mette in pausa la simulazione con la scorciatoia "Spazio" (i pianeti sono
// elementi animati: Playwright non li clicca in modo stabile se si muovono).
const pauseSim = async (p) => {
  await p.locator('body').click({ position: { x: 5, y: 5 } });
  await p.keyboard.press('Space');
};

// I pianeti sono coperti da anelli orbitali e altri elementi decorativi che
// intercettano i pointer event: per una selezione affidabile usiamo un click
// sintetico direttamente sull'elemento del pianeta.
const selectPlanet = async (p, nameIt) => {
  await p.evaluate((label) => {
    const el = document.querySelector(`[aria-label="Seleziona ${label}"]`);
    if (!el) throw new Error(`Pianeta non trovato: ${label}`);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, nameIt);
};

// 1. Vista principale (avvio, animazioni in corso)
await page.goto(BASE, { waitUntil: 'networkidle' });
await shot('01-home', 2500);

// 2. Modalità realistica: texture procedurali, lune e fascia degli asteroidi
await page.getByRole('button', { name: 'Realismo' }).click();
await shot('02-realism-mode', 3000);
await pauseSim(page);

// 3. Pannello informativo: seleziona la Terra
await selectPlanet(page, 'Terra');
await shot('03-planet-info', 1200);

// 4. Modalità confronto pianeti
await page.keyboard.press('Escape');
await page.getByRole('button', { name: '⚖️ Confronto' }).click();
await shot('04-compare', 1000);

// 5. Quiz mode
await page.getByLabel('Chiudi confronto').click();
await page.getByRole('button', { name: '🧠 Quiz' }).click();
await shot('05-quiz', 1000);

// 6. Mobile layout (paesaggio: lo screenshot verticale non sta in un frame)
const mobile = await browser.newPage({ viewport: { width: 844, height: 390 } });
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.getByRole('button', { name: 'Realismo' }).click({ force: true });
await mobile.waitForTimeout(2500);
await mobile.screenshot({ path: path.join(OUT, '06-mobile.png') });
console.log('✔ docs/images/06-mobile.png');

await browser.close();
console.log('Screenshot generati in docs/images/');
