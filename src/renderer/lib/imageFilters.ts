import Konva from 'konva';
import type { Filter } from 'konva/lib/Node';

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
// Применяет цепочку фильтров к Konva.Image-ноде: перекраска + яркость +
// контраст. brightness ∈ [-1..1] (0 = норма), contrast ∈ [-100..100] (0 = норма).
// Для работы фильтров нода кешируется; если все параметры пустые — кеш сброшен.
export function applyImageAdjust(
  node: Konva.Image,
  opts: { recolor?: RecolorKey; brightness?: number; contrast?: number },
): void {
  const recolor = opts.recolor && opts.recolor !== 'none' ? opts.recolor : null;
  const brightness = opts.brightness ?? 0;
  const contrast = opts.contrast ?? 0;
  const filters: Filter[] = [];

  if (recolor === 'grayscale') filters.push(Konva.Filters.Grayscale);
  else if (recolor === 'sepia') filters.push(Konva.Filters.Sepia);
  else if (recolor) {
    filters.push(Konva.Filters.RGB);
    const t = TINTS[recolor];
    node.red(t.r);
    node.green(t.g);
    node.blue(t.b);
  }
  if (brightness !== 0) {
    filters.push(Konva.Filters.Brighten);
    node.brightness(Math.max(-1, Math.min(1, brightness)));
  }
  if (contrast !== 0) {
    filters.push(Konva.Filters.Contrast);
    node.contrast(Math.max(-100, Math.min(100, contrast)));
  }

  if (filters.length === 0) {
    node.filters([]);
    node.clearCache();
    return;
  }
  node.cache();
  node.filters(filters);
}
