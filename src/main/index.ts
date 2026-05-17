import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows.js';
import { registerAppProtocolSchema, registerAppProtocolHandlers } from './protocol.js';

// Привилегированные схемы должны быть объявлены до app.whenReady().
registerAppProtocolSchema();

// Single-instance lock: не даём запускать второй экземпляр приложения параллельно
// (на Phase 8 здесь же будет open-file forwarding для file associations).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  const windows = BrowserWindow.getAllWindows();
  const main = windows[0];
  if (main) {
    if (main.isMinimized()) main.restore();
    main.focus();
  }
});

app
  .whenReady()
  .then(() => {
    registerAppProtocolHandlers();
    createMainWindow();

    // macOS: пересоздать окно при клике по доковой иконке, если все окна закрыты.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize app:', err);
    app.exit(1);
  });

// На Windows / Linux выходим из приложения, когда все окна закрыты.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
