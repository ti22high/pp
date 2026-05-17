import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'node:path';

// Smoke-тест: запускает собранное Electron-приложение и убеждается,
// что первое окно открывается и в нём виден заголовок «SlidesClone».
//
// Требование: перед запуском должен быть выполнен `npm run build`
// (out/main/index.js должен существовать).
test('main window opens with SlidesClone title', async () => {
  const app = await electron.launch({
    args: [resolve('out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const heading = window.locator('h1');
  await expect(heading).toHaveText('SlidesClone');

  await app.close();
});
