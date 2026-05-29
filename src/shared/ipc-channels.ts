// Единый реестр IPC-каналов между main и renderer.
// Хранится в shared, чтобы и main, и preload, и renderer ссылались на одни и те же строки.
// Конкретные хендлеры регистрируются в src/main/ipc/* (появятся в Phase 5/6/7).

export const IpcChannels = {
  // Файловые операции (Phase 5).
  FileOpen: 'file:open',
  FileSave: 'file:save',
  FileSaveAs: 'file:save-as',
  FileNew: 'file:new',
  FileExportPdf: 'file:export-pdf',
  FileExportPptx: 'file:export-pptx',
  FileExportPng: 'file:export-png',
  FileExportSvg: 'file:export-svg',
  FileExportTxt: 'file:export-txt',
  FileImportCsv: 'file:import-csv',
  // Picker (диалог + чтение байтов) для импорта .pptx / .gslx.
  FilePick: 'file:pick',

  // Медиа: сохранение/чтение картинок и видео внутри проекта (Phase 3).
  MediaSave: 'media:save',
  MediaLoad: 'media:load',
  MediaDelete: 'media:delete',

  // Список недавних файлов (Phase 7, better-sqlite3).
  RecentList: 'recent:list',
  RecentAdd: 'recent:add',
  RecentClear: 'recent:clear',

  // Autosave + crash recovery (Phase 7).
  RecoveryCheck: 'recovery:check',
  RecoveryRestore: 'recovery:restore',
  RecoveryDiscard: 'recovery:discard',
  AutosaveTick: 'autosave:tick',

  // Окно докладчика (Phase 6).
  PresenterStart: 'presenter:start',
  PresenterStop: 'presenter:stop',
  PresenterNext: 'presenter:next',
  PresenterPrev: 'presenter:prev',
  PresenterSlide: 'presenter:slide',
  PresenterTimerToggle: 'presenter:timer-toggle',
  PresenterTimerReset: 'presenter:timer-reset',

  // Меню → renderer (события от native menu).
  MenuCommand: 'menu:command',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
