import { ipcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels.js';
import { saveMedia, mediaExists } from '../media.js';

// IPC-хендлеры для медиа (Спринт A.2). Регистрируется один раз в whenReady().
export function registerMediaIpc(): void {
  // Renderer передаёт байты (ArrayBuffer проходит через structured clone) и
  // расширение, получает имя файла '<sha256>.<ext>' для подстановки в
  // 'app://media/<name>'.
  ipcMain.handle(
    IpcChannels.MediaSave,
    async (_e, payload: { bytes: ArrayBuffer; ext: string }) => {
      const bytes = new Uint8Array(payload.bytes);
      return await saveMedia(bytes, payload.ext);
    },
  );

  // Канал MediaLoad используется как «есть ли такое медиа на диске» —
  // полезно при загрузке деков для проверки целостности ссылок.
  ipcMain.handle(IpcChannels.MediaLoad, async (_e, name: string) => {
    return await mediaExists(name);
  });
}
