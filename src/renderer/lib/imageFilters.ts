import Konva from 'konva';

// Пресеты перекраски изображения (Phase 3.4). Реализованы через встроенные
// фильтры Konva: Grayscale, Sepia и RGB (последний даёт тонирование — каждый
// пиксель приводится к яркости и красится в цвет пресета).

export type RecolorKey =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'tintBlue'
  | 'tintGreen'
  | 'tintRed'
  | 'tintPurple';

export interface RecolorOption {
  key: RecolorKey;
  label: string;
}

export const RECOLOR_OPTIONS: RecolorOption[] = [
  { key: 'none', label: 'Без перекраски' },
  { key: 'grayscale', label: 'Чёрно-белое' },
  { key: 'sepia', label: 'Сепия' },
  { key: 'tintBlue', label: 'Синий оттенок' },
  { key: 'tintGreen', label: 'Зелёный оттенок' },
  { key: 'tintRed', label: 'Красный оттенок' },
  { key: 'tintPurple', label: 'Фиолетовый оттенок' },
];

const TINTS: Record<string, { r: number; g: number; b: number }> = {
  tintBlue: { r: 26, g: 115, b: 232 },
  tintGreen: { r: 19, g: 115, b: 51 },
  tintRed: { r: 165, g: 14, b: 14 },
  tintPurple: { r: 156, g: 39, b: 176 },
};

// Применяет (или снимает) перекраску к Konva.Image-ноде. Для работы фильтров
// нода кешируется; при 'none' кеш сбрасывается.
export function applyRecolor(node: Konva.Image, key: RecolorKey | undefined): void {
  if (!key || key === 'none') {
    node.filters([]);
    node.clearCache();
    return;
  }
  // Кеш нужен для фильтров; pixelRatio оставляем дефолтным.
  node.cache();
  if (key === 'grayscale') {
    node.filters([Konva.Filters.Grayscale]);
  } else if (key === 'sepia') {
    node.filters([Konva.Filters.Sepia]);
  } else {
    const t = TINTS[key];
    node.filters([Konva.Filters.RGB]);
    node.red(t.r);
    node.green(t.g);
    node.blue(t.b);
  }
}
