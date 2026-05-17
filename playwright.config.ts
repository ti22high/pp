import { defineConfig } from '@playwright/test';

// E2E через Playwright Electron-launcher.
// Конкретные сценарии запускают electron из out/, поэтому до e2e нужен `npm run build`.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
