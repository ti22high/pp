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
  // Чтение системного буфера обмена (для вставки картинок/таблиц из Excel/
  // Sheets/скриншотов независимо от DOM paste-события).
  clipboard: {
    readImage(): string; // data URL или '' если картинки нет
    readHTML(): string;
    readText(): string;
    // Доступные форматы буфера (диагностика Office-формата графиков).
    availableFormats(): string[];
    // Сырые байты формата как base64 (для парсинга встроенного .xlsx/zip).
    readBufferBase64(format: string): string;
  };
  // MediaManager (Спринт A.2): сохранение медиа на диск в userData/media/.
  // save() возвращает имя файла '<sha256>.<ext>' для подстановки в
  // 'app://media/<имя>'. exists() — проверка целостности ссылок.
  media: {
    save(bytes: ArrayBuffer, ext: string): Promise<string>;
    exists(name: string): Promise<boolean>;
  };
}
