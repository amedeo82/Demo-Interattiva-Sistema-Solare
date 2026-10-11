/**
 * S10a · M6c — Playwright config per E2E multi-viewport.
 *
 * Esegue una smoke suite su Chromium per i 5 viewport definiti in
 * AGENTS.md (393×852, 375×667, 768×1024, 1280×800, 1440×900). Il
 * server di anteprima viene avviato automaticamente se non già in
 * esecuzione (porta 4173, default di `vite preview`).
 *
 * - `retries: 1` per resilienza a flake
 * - `trace: 'on-first-retry'` per debugging
 * - timeout singolo test 30s (la scena lazy può richiedere tempo)
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-iphone15pro', use: { ...devices['iPhone 15 Pro'] } },
    { name: 'mobile-iphonese', use: { ...devices['iPhone SE'] } },
    { name: 'tablet-ipad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run preview',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
