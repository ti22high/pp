// Глобальные константы приложения, разделяемые между main и renderer.

// Размер слайда по умолчанию — 16:9 в пикселях (SPEC §5.2, §6.3).
export const DEFAULT_SLIDE_WIDTH = 1920;
export const DEFAULT_SLIDE_HEIGHT = 1080;

// Конверсия EMU (English Metric Unit) ↔ px при 96 DPI (SPEC §2, §6.1).
export const EMU_PER_PX = 9525;

// Лимит истории undo/redo (SPEC §4.6).
export const UNDO_STACK_SIZE = 100;
export const UNDO_COALESCE_MS = 500;

// Autosave (SPEC §1.20).
export const AUTOSAVE_DEBOUNCE_MS = 5_000;
export const AUTOSAVE_HARD_INTERVAL_MS = 30_000;
export const HISTORY_SNAPSHOT_INTERVAL_MS = 5 * 60_000;

// Native-формат документа.
export const FILE_FORMAT = 'gslx' as const;
export const FILE_FORMAT_VERSION = 1 as const;
