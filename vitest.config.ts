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
  },
});
