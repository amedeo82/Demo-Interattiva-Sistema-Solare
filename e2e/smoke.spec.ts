/**
 * S10a · M6c — Smoke E2E multi-viewport.
 *
 * Verifica i controlli elencati in AGENTS.md:
 *  - `elementFromPoint` al centro viewport = `CANVAS` (non un wrapper)
 *  - FAB apre la controls sheet (mobile)
 *  - selezionare un pianeta apre il pannello info
 *  - il quiz si apre
 *  - nessun errore JS in `pageerror` / `console.error`
 *
 * Eseguito per ogni viewport definito in `playwright.config.ts`.
 */
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

async function waitForScene(page: Page): Promise<void> {
  // Aspetta che la scena sia montata: cerca il canvas R3F.
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 15_000 });
  // Attesa extra per il lazy load della scena 3D
  await page.waitForLoadState('networkidle');
  // Aspetta che al centro del viewport ci sia il canvas (no loading screen, no OnboardingTip)
  await page.waitForFunction(
    () =>
      document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.tagName ===
      'CANVAS',
    undefined,
    { timeout: 15_000 }
  );
}

/**
 * Forza il locale italiano prima di interagire con la UI.
 *
 * La app legge `localStorage[PREFS_KEYS.lang]` al mount del modulo i18n
 * (`loadLocale()` in `src/i18n/index.ts`): se è `'en'` setta `locale='en'`,
 * altrimenti default italiano. In un contesto Playwright fresco
 * normalmente è 'it' (default), ma se un test precedente (in CI con
 * riuso del browser profile) avesse lasciato `lang='en'` le stringhe
 * cercate dai locator cambierebbero ("Dati" → "Data", "Domanda" →
 * "Question") e i test fallirebbero. Settare `lang='it'` esplicitamente
 * elimina la dipendenza dallo stato persistente fra run.
 */
async function forceItalianLocale(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('solarsys.lang', 'it');
    } catch {
      /* storage non disponibile: usa default */
    }
  });
}

test.describe('smoke', () => {
  test('la scena 3D è visibile e al centro viewport', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    await page.goto('/');
    await waitForScene(page);

    // L'elemento al centro deve essere il canvas (NON un wrapper sovrapposto)
    const center = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return el ? el.tagName : null;
    });
    expect(center, 'centro viewport deve essere il canvas').toBe('CANVAS');

    // Nessun errore JS durante l'inizializzazione
    const criticalErrors = errors.filter(
      (e) => !/DevTools|service worker|favicon|manifest/i.test(e)
    );
    expect(criticalErrors, `errori JS: ${criticalErrors.join(' | ')}`).toEqual([]);
  });

  test('FAB controlli apre la bottom sheet su mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'test solo per viewport mobile');
    await page.goto('/');
    await waitForScene(page);

    // FAB "Controlli" in basso a destra
    const fab = page.getByRole('button', { name: /controlli/i });
    await expect(fab).toBeVisible();
    await fab.click();

    // La sheet mostra la lista pianeti: cerca "Mercurio" (sempre presente)
    await expect(page.getByRole('button', { name: /mercurio/i })).toBeVisible();
  });

  test('selezionare un pianeta apre il pannello info', async ({ page, isMobile }) => {
    await forceItalianLocale(page);
    await page.goto('/');
    await waitForScene(page);

    if (isMobile) {
      // Apri la sheet prima
      const fab = page.getByRole('button', { name: /controlli/i });
      await fab.click();
    }

    // Clicca "Terra" nella lista pianeti. Il click è asincrono (state
    // update → re-render): attendi che il dialog sia in DOM prima di
    // verificare le tab, così il test fallisce con un errore chiaro
    // invece di un timeout generico su CI lenti.
    await page.getByRole('button', { name: /terra/i }).first().click();
    const dialog = page.getByRole('dialog', { name: /Informazioni su Terra/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Il pannello info espone le tab "Dati" / "Atmosfera" / "Missioni" /
    // "Curiosità". 10s di timeout per tollerare GC pause su CI Ubuntu.
    await expect(page.getByRole('tab', { name: /dati/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('il quiz si apre', async ({ page, isMobile }) => {
    await forceItalianLocale(page);
    await page.goto('/');
    await waitForScene(page);

    if (isMobile) {
      const fab = page.getByRole('button', { name: /controlli/i });
      await fab.click();
    }

    // Il bottone "Quiz" può essere nel menu ⋯ su mobile; cercalo per nome accessibile
    const quizButton = page.getByRole('button', { name: /quiz/i }).first();
    await quizButton.click();

    // QuizModal è lazy-loaded: la prima apertura deve scaricare il chunk.
    // Aspettiamo prima il dialog (segnale forte che il modal è montato),
    // poi il testo "Domanda N di M" — la regex copre sia "Domanda 1 di 5"
    // sia "Prossima domanda →" (visibile dopo la prima risposta).
    // Timeout 10s per coprire download del chunk + GC pause su CI.
    const quizDialog = page.getByRole('dialog', { name: /Quiz/i });
    await expect(quizDialog).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/domanda|risposta/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
