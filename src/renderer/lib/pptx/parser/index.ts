// Главный orchestrator парсера .pptx (Спринт B.11).
//
// Точка входа: parsePptx(bytes, onProgress?) → { deck, warnings }.
// Архитектура: per-slide парсинг с прогресс-колбэком (для UI 200–300 слайдов).
// При ошибке отдельного слайда — пропуск + warning, но не throw всего парсинга.

import { createEmptyDeck } from '../../model/factory';
import type { Deck, Slide } from '../../model/schema';
import { openPptxArchive } from './zip';
import { parsePresentation } from './presentation';
import { parseTheme } from './theme';
import { parseSlide } from './slide';
import { v4 as uuid } from 'uuid';

export interface ParseProgress {
  current: number; // обработано слайдов
  total: number; // всего слайдов
  message: string; // 'Распаковка', 'Разбор темы', `Слайд ${i}/${n}`, …
}

export interface ParsePptxResult {
  deck: Deck;
  warnings: string[];
}

const THEME_PATH = 'ppt/theme/theme1.xml';

export async function parsePptx(
  bytes: ArrayBuffer,
  onProgress?: (p: ParseProgress) => void,
): Promise<ParsePptxResult> {
  const warnings: string[] = [];

  onProgress?.({ current: 0, total: 0, message: 'Распаковка архива…' });
  const archive = await openPptxArchive(bytes);

  onProgress?.({ current: 0, total: 0, message: 'Разбор презентации…' });
  const presentation = await parsePresentation(archive);

  onProgress?.({ current: 0, total: 0, message: 'Разбор темы…' });
  const theme = await parseTheme(archive, THEME_PATH);

  const total = presentation.slidePaths.length;
  const slides: Slide[] = [];
  for (let i = 0; i < total; i++) {
    const path = presentation.slidePaths[i];
    onProgress?.({ current: i, total, message: `Слайд ${i + 1} / ${total}` });
    try {
      const slide = await parseSlide(path, { archive, theme });
      slides.push(slide);
    } catch (e) {
      warnings.push(`Слайд ${i + 1} (${path}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  onProgress?.({ current: total, total, message: 'Готово' });

  // Собираем deck.
  const deck = createEmptyDeck('Импортированная презентация');
  deck.size = presentation.size;
  // createEmptyDeck даёт один пустой слайд — заменяем нашими.
  deck.slides = {};
  deck.slideOrder = [];
  for (const slide of slides) {
    const id = slide.id ?? uuid();
    slide.id = id;
    deck.slides[id] = slide;
    deck.slideOrder.push(id);
  }
  // Если ни одного слайда — оставляем пустой созданный default-слайд.
  if (deck.slideOrder.length === 0) {
    const fallbackDeck = createEmptyDeck(deck.title);
    fallbackDeck.size = presentation.size;
    return { deck: fallbackDeck, warnings };
  }

  return { deck, warnings };
}
