import { contextBridge, ipcRenderer, clipboard } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { PreloadApi } from './types.js';
import { IpcChannels } from '../shared/ipc-channels.js';

// Мост между renderer и main: всё, что renderer может вызвать, объявлено здесь.
// contextIsolation: true в windows.ts => renderer не имеет прямого доступа к Node.js.
const api: PreloadApi = {
  getVersions: () => ({
    electron: process.versions.electron ?? 'unknown',
    chrome: process.versions.chrome ?? 'unknown',
    node: process.versions.node ?? 'unknown',
    app: '0.1.0',
  }),
  onMenuCommand: (callback) => {
    const handler = (_e: IpcRendererEvent, command: string) => callback(command);
    ipcRenderer.on(IpcChannels.MenuCommand, handler);
    return () => ipcRenderer.off(IpcChannels.MenuCommand, handler);
  },
  clipboard: {
    readImage: () => {
      const img = clipboard.readImage();
      return img.isEmpty() ? '' : img.toDataURL();
    },
    readHTML: () => clipboard.readHTML(),
    readText: () => clipboard.readText(),
    availableFormats: () => clipboard.availableFormats(),
    readBufferBase64: (format: string) => {
      try {
        return clipboard.readBuffer(format).toString('base64');
      } catch {
        return '';
      }
    },
  },
  media: {
    save: (bytes: ArrayBuffer, ext: string) =>
      ipcRenderer.invoke(IpcChannels.MediaSave, { bytes, ext }),
    exists: (name: string) => ipcRenderer.invoke(IpcChannels.MediaLoad, name),
  },
};

contextBridge.exposeInMainWorld('api', api);
