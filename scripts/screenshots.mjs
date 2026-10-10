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

const shot = async (page, name, waitMs = 1800) => {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`✔ docs/images/${name}.png`);
};

// Mette in pausa la simulazione con la scorciatoia "Spazio".
const pauseSim = async (p) => {
  await p.locator('body').click({ position: { x: 5, y: 5 } });
  await p.keyboard.press('Space');
};

// Selezione dalla sidebar (accessibile anche in jsdom e Playwright).
// La sidebar è sempre montata: su desktop è laterale, su mobile vive
// nella bottom sheet (chiamiamo openControlsSheet prima se serve).
const selectPlanet = async (p, nameIt) => {
  // Se la bottom sheet mobile è chiusa, apriamola per trovare il bottone.
  const fab = p.locator('button.mobile-fab');
  if (await fab.isVisible().catch(() => false)) {
    const expanded = await fab.getAttribute('aria-expanded').catch(() => 'false');
    if (expanded === 'false') await fab.click();
  }
  await p.getByRole('button', { name: new RegExp(`^${nameIt}$`) }).first().click();
};

// ── Desktop 1440×900 ─────────────────────────────────────────────
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Vista principale (S5+S6: header compatto, FAB, chip Realismo/Eclissi/Foto)
await desktop.goto(BASE, { waitUntil: 'networkidle' });
await shot(desktop, '01-home', 3000);

// 2. Modalità realismo + eclissi ON: texture NASA, lune, asteroidi, ombre
await desktop.getByRole('button', { name: 'Realismo' }).click();
await desktop.getByRole('button', { name: 'Eclissi' }).click().catch(() => {
  // Se il chip non c'è (vecchia build), skip silenzioso
});
await shot(desktop, '02-realism-mode', 3500);
await pauseSim(desktop);

// 3. Pannello informativo Terra (S4: scan line, drag, mission log)
await selectPlanet(desktop, 'Terra');
await shot(desktop, '03-planet-info', 1500);

// 4. Modalità confronto pianeti (voce dentro il menu overflow "⋯")
// Apri il menu e clicca via DOM dispatch (più affidabile del pointer event).
await desktop.keyboard.press('Escape');
await desktop.waitForTimeout(500);
await desktop.getByRole('button', { name: /Altre opzioni/i }).click();
await desktop.waitForTimeout(300);
await desktop.evaluate(() => {
  const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
  const compare = items.find((el) => /Confronto/i.test(el.textContent || ''));
  if (compare) compare.click();
});
await desktop.waitForSelector('[role="dialog"][aria-label*="Confronto"]', { timeout: 5000 });
await shot(desktop, '04-compare', 1500);

// 5. Quiz
await desktop.locator('[aria-label="Chiudi confronto"]').click({ force: true });
await desktop.waitForTimeout(800);
await desktop.getByRole('button', { name: /Quiz/i }).first().click({ force: true });
await desktop.waitForSelector('[role="dialog"][aria-label*="Quiz"]', { timeout: 5000 });
await shot(desktop, '05-quiz', 1500);

// ── Mobile 390×844 (iPhone 14 viewport) ─────────────────────────
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: 'networkidle' });

// 6. Mobile: scena a tutto schermo + FAB "☰ Controlli" + chip Realismo
await mobile.getByRole('button', { name: 'Realismo' }).click({ force: true }).catch(() => {});
await shot(mobile, '06-mobile', 3000);

// 7. Mobile con bottom sheet controlli aperta
await mobile.locator('button.mobile-fab').click();
await shot(mobile, '07-mobile-controls', 1000);

// 8. Mobile con pannello info Terra aperto
await selectPlanet(mobile, 'Terra');
await shot(mobile, '08-mobile-info', 1500);

await browser.close();
console.log('Screenshot generati in docs/images/');
