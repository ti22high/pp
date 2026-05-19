import { BrowserWindow, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Корень main-процесса (нужен, чтобы строить пути к preload и собранному рендереру).
const __dirname = dirname(fileURLToPath(import.meta.url));

// Создаёт главное окно редактора.
// В dev-режиме electron-vite пробрасывает URL рендерера через ELECTRON_RENDERER_URL.
// В production — грузим собранный index.html из out/renderer.
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: '#fafafa',
    title: 'SlidesClone',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  // Гасим встроенный webContents zoom: пользователь должен видеть только
  // Stage-зум, а Cmd/Ctrl +/-/0 — управлять им через наше меню. Иначе на
  // Cmd/Ctrl+- помимо нашего zoom-out срабатывает ещё и chromium-овый
  // zoom-out, и страница ужимается до невидимого.
  win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  win.webContents.on('did-finish-load', () => {
    void win.webContents.setZoomFactor(1);
  });
  win.webContents.on('zoom-changed', () => {
    void win.webContents.setZoomFactor(1);
  });

  // Внешние ссылки открываем в системном браузере, не в окне приложения.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
