// Контракт API, экспонируемого из preload в renderer через contextBridge.
// На Phase 1 — только smoke-метод getVersions(). Реальные IPC-методы (file:open,
// file:save, export:* и др.) появятся в Phase 5/7.

export interface VersionsInfo {
  electron: string;
  chrome: string;
  node: string;
  app: string;
}

export interface PreloadApi {
  // Возвращает версии runtime — для отладки и About-диалога.
  getVersions(): VersionsInfo;
  // Подписка на команды native-меню. Возвращает unsubscribe.
  onMenuCommand(callback: (command: string) => void): () => void;
}
