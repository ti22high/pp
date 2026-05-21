import { test, expect, _electron as electron } from '@playwright/test';
import { resolve } from 'node:path';

// E2E (§2.T): создать слайд, добавить фигуру, отменить.
// Требует предварительного `npm run build` (out/main/index.js).
//
// Между мутациями ждём >300 ms: undo дебаунсит изменения в один шаг истории,
// поэтому без паузы «новый слайд» и «добавить фигуру» слились бы в одно undo.
const STEP_PAUSE = 400;

test('create slide, add shape, undo', async () => {
  const app = await electron.launch({
    args: [resolve('out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Стартовое состояние — один слайд.
  await expect(window.locator('.panel-title')).toHaveText('Слайды (1)');

  // Новый слайд (Ctrl/Cmd+M).
  await window.keyboard.press('ControlOrMeta+m');
  await expect(window.locator('.panel-title')).toHaveText('Слайды (2)');
  await window.waitForTimeout(STEP_PAUSE);

  // Добавляем прямоугольник через библиотеку фигур (тулбар «Фигуры» →
  // пресет «Прямоугольник») — в превью активного слайда появляется
  // DOM-представление фигуры (.fs-item__shape).
  await window.getByRole('button', { name: 'Фигуры' }).click();
  await window.getByRole('button', { name: 'Прямоугольник' }).click();
  const activePreview = window.locator('.fs-item--active .fs-item__shape');
  await expect(activePreview).toHaveCount(1);
  await window.waitForTimeout(STEP_PAUSE);

  // Undo (Ctrl/Cmd+Z) — фигура исчезает.
  await window.keyboard.press('ControlOrMeta+z');
  await expect(activePreview).toHaveCount(0);

  await app.close();
});
