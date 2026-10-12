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
    await page.goto('/');
    await waitForScene(page);

    if (isMobile) {
      // Apri la sheet prima
      const fab = page.getByRole('button', { name: /controlli/i });
      await fab.click();
    }

    // Clicca "Terra" nella lista pianeti
    await page.getByRole('button', { name: /terra/i }).first().click();

    // Il pannello info appare (ha tab "Dati" / "Atmosfera" / "Missioni" / "Curiosità")
    await expect(page.getByRole('tab', { name: /dati/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('il quiz si apre', async ({ page, isMobile }) => {
    await page.goto('/');
    await waitForScene(page);

    if (isMobile) {
      const fab = page.getByRole('button', { name: /controlli/i });
      await fab.click();
    }

    // Il bottone "Quiz" può essere nel menu ⋯ su mobile; cercalo per nome accessibile
    const quizButton = page.getByRole('button', { name: /quiz/i }).first();
    await quizButton.click();

    // Il modal Quiz mostra "Prossima domanda →" o "Domanda 1 di N"
    await expect(page.getByText(/domanda|risposta/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
