import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Unit-тесты живут в tests/unit/**; e2e — отдельно через Playwright.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    globals: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/shared'),
    },
  },
});
