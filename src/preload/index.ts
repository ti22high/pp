import { contextBridge } from 'electron';
import type { PreloadApi } from './types.js';

// Мост между renderer и main: всё, что renderer может вызвать, объявлено здесь.
// contextIsolation: true в windows.ts => renderer не имеет прямого доступа к Node.js.
const api: PreloadApi = {
  getVersions: () => ({
    electron: process.versions.electron ?? 'unknown',
    chrome: process.versions.chrome ?? 'unknown',
    node: process.versions.node ?? 'unknown',
    app: '0.1.0',
  }),
};

contextBridge.exposeInMainWorld('api', api);
