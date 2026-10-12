import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // S10a · M6c: esclude la cartella e2e/ (gestita da Playwright,
    // non da Vitest). Senza di questo, Vitest tenta di eseguire
    // test.describe() di Playwright come suite Vitest → errore.
    exclude: ['node_modules', 'dist', 'e2e/**', '.{idea,git,cache,output}'],
    // S14 — file eseguiti in serie: con la suite cresciuta (>25 file)
    // il parallelismo fra thread genera timeout flaky su macchine
    // lente (es. test App mobile a 5s). Il costo in CI è ~1min, il
    // beneficio è la determinabilità.
    fileParallelism: false,
  },
});
