import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { IpcChannels } from '../../shared/ipc-channels.js';

// Опции пикера. Совместимо с Electron OpenDialog: filters, title.
export interface PickFileOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  // Жёсткий лимит на размер — защита от случайного открытия мульти-гигабайтного
  // файла. По умолчанию 500 МБ (хватит на 200+ МБ .pptx и оставит запас).
  maxBytes?: number;
}

export interface PickedFile {
  path: string;
  name: string;
  size: number;
  bytes: ArrayBuffer;
}

const DEFAULT_MAX = 500 * 1024 * 1024; // 500 МБ

// Открывает системный файловый диалог и читает выбранный файл целиком в
// ArrayBuffer (Спринт A.10). Передаётся в renderer для парсинга .pptx/.gslx —
// JSZip в renderer'е умеет загружать ArrayBuffer без дополнительных копий.
// Возвращает null если пользователь отменил, или бросает Error при превышении
// размера / ошибке чтения (renderer показывает сообщение).
export function registerFileIpc(): void {
  ipcMain.handle(
    IpcChannels.FilePick,
    async (event, options: PickFileOptions = {}): Promise<PickedFile | null> => {
      const browserWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
      const result = browserWindow
        ? await dialog.showOpenDialog(browserWindow, {
            title: options.title ?? 'Открыть файл',
            properties: ['openFile'],
            filters: options.filters,
          })
        : await dialog.showOpenDialog({
            title: options.title ?? 'Открыть файл',
            properties: ['openFile'],
            filters: options.filters,
          });

      if (result.canceled || result.filePaths.length === 0) return null;
      const filePath = result.filePaths[0];

      const max = options.maxBytes ?? DEFAULT_MAX;
      const st = await stat(filePath);
      if (st.size > max) {
        throw new Error(
          `Файл слишком большой: ${(st.size / 1024 / 1024).toFixed(1)} МБ, лимит ${(
            max /
            1024 /
            1024
          ).toFixed(0)} МБ.`,
        );
      }

      const buf = await readFile(filePath);
      // Buffer → ArrayBuffer без копирования всей памяти.
      const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return {
        path: filePath,
        name: basename(filePath),
        size: st.size,
        bytes,
      };
    },
  );
}
