// Операции с самими слайдами (создание, дубль, удаление, hide).
// Используются меню «Слайд» и filmstrip-контекстом.

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { createEmptySlide, cloneSlide } from '@renderer/lib/model/factory';
import { getLayout, type LayoutKey } from '@renderer/lib/model/layouts';
import { measureWordArt } from '@renderer/lib/wordart';
import type { SlideBackground } from '@renderer/lib/model/schema';

export function newSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  let createdId: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = createEmptySlide();
    createdId = slide.id;
    state.deck.slides[slide.id] = slide;
    if (activeId) {
      const idx = state.deck.slideOrder.indexOf(activeId);
      // Вставляем сразу ПОСЛЕ активного.
      state.deck.slideOrder.splice(idx + 1, 0, slide.id);
    } else {
      state.deck.slideOrder.push(slide.id);
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
  if (createdId) {
    useUiStore.getState().setActiveSlide(createdId);
    useSelectionStore.getState().clear();
  }
}

export function duplicateSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  let createdId: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const src = state.deck.slides[activeId];
    if (!src) return;
    const copy = cloneSlide(src);
    createdId = copy.id;
    state.deck.slides[copy.id] = copy;
    const idx = state.deck.slideOrder.indexOf(activeId);
    state.deck.slideOrder.splice(idx + 1, 0, copy.id);
    state.deck.modifiedAt = new Date().toISOString();
  });
  if (createdId) {
    useUiStore.getState().setActiveSlide(createdId);
    useSelectionStore.getState().clear();
  }
}

export function deleteSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  let nextActive: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const order = state.deck.slideOrder;
    const idx = order.indexOf(activeId);
    if (idx < 0) return;
    // Не даём удалить последний слайд — заменим его на пустой, чтобы
    // в деке всегда был хотя бы один.
    if (order.length === 1) {
      const fresh = createEmptySlide();
      delete state.deck.slides[activeId];
      state.deck.slides[fresh.id] = fresh;
      state.deck.slideOrder = [fresh.id];
      nextActive = fresh.id;
    } else {
      order.splice(idx, 1);
      delete state.deck.slides[activeId];
      // Следующий активный — сосед справа (если был); иначе слева.
      nextActive = order[idx] ?? order[idx - 1] ?? null;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
  useUiStore.getState().setActiveSlide(nextActive);
  useSelectionStore.getState().clear();
}

// Создаёт новый слайд с placeholder-фигурами выбранного layout-а и делает
// его активным. Layout-координаты базируются на 1920×1080 — пропорционально
// масштабируются под текущий deck.size.
//
// До этого пункт делал «применить макет к текущему» — но плейсхолдеры
// просто накладывались поверх существующего контента, что путало.
// Slides-овский UX: «New slide with layout» — отдельный слайд из шаблона.
export function applyLayout(key: LayoutKey): void {
  const layout = getLayout(key);
  if (!layout) return;
  const activeId = useUiStore.getState().activeSlideId;
  let createdId: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = createEmptySlide();
    const sx = state.deck.size.w / 1920;
    const sy = state.deck.size.h / 1080;
    slide.shapes = layout.build().map((sh) => ({
      ...sh,
      x: sh.x * sx,
      y: sh.y * sy,
      w: sh.w * sx,
      h: sh.h * sy,
    }));
    slide.layoutId = key;
    state.deck.slides[slide.id] = slide;
    createdId = slide.id;
    if (activeId) {
      const idx = state.deck.slideOrder.indexOf(activeId);
      state.deck.slideOrder.splice(idx + 1, 0, slide.id);
    } else {
      state.deck.slideOrder.push(slide.id);
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
  if (createdId) {
    useUiStore.getState().setActiveSlide(createdId);
    useSelectionStore.getState().clear();
  }
}

// Ставит фон конкретного слайда. `bg` = undefined трактуется как «вернуть к
// дефолту схемы» — у нас это `{ type: 'theme' }` (наследует фон мастера). Это
// и есть «сброс» в терминах меню «Слайд → Фон…».
export function setSlideBackground(
  slideId: string,
  bg: SlideBackground | undefined,
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    slide.background = bg ?? { type: 'theme' };
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Применяет фон ко всем слайдам деки. Используется кнопкой «Применить ко всем»
// в BackgroundEditor — типичный UX из Slides / PowerPoint.
export function setAllSlidesBackground(
  bg: SlideBackground | undefined,
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const next = bg ?? { type: 'theme' };
    for (const id of state.deck.slideOrder) {
      const slide = state.deck.slides[id];
      if (slide) slide.background = next;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Меняет размер слайда деки. Если `scaleContent=true` — все фигуры всех
// слайдов масштабируются пропорционально (отдельные коэффициенты по X и Y).
// Без масштабирования фигуры остаются на прежних координатах; те, что
// выпали за пределы нового размера, пользователь подвинет сам.
//
// Размеры — в пикселях слайд-координат (px @96 DPI). Конверсия из in/cm/pt
// в px делается в UI-слое SlideSizeDialog.
export function setDeckSize(w: number, h: number, scaleContent: boolean): void {
  if (!(w > 0) || !(h > 0)) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const oldW = state.deck.size.w;
    const oldH = state.deck.size.h;
    if (oldW === w && oldH === h) return;
    state.deck.size = { w, h };
    if (scaleContent && oldW > 0 && oldH > 0) {
      const sx = w / oldW;
      const sy = h / oldH;
      for (const id of state.deck.slideOrder) {
        const slide = state.deck.slides[id];
        if (!slide) continue;
        for (const sh of slide.shapes) {
          sh.x = sh.x * sx;
          sh.y = sh.y * sy;
          sh.w = sh.w * sx;
          sh.h = sh.h * sy;
        }
      }
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Ставит пресет перекраски изображения (Phase 3.4).
export function setImageRecolor(
  slideId: string,
  shapeId: string,
  recolor: import('@renderer/lib/model/schema').ImageShape['recolor'],
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'image') return;
    sh.recolor = recolor === 'none' ? undefined : recolor;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Ставит яркость/контраст изображения (Phase 3.5). 0 → undefined (чистим JSON).
export function setImageAdjust(
  slideId: string,
  shapeId: string,
  patch: { brightness?: number; contrast?: number },
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'image') return;
    if (patch.brightness !== undefined) {
      sh.brightness = patch.brightness === 0 ? undefined : patch.brightness;
    }
    if (patch.contrast !== undefined) {
      sh.contrast = patch.contrast === 0 ? undefined : patch.contrast;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Сбрасывает недеструктивные правки картинки (Phase 3.6): перекраска, яркость,
// контраст, прозрачность. Crop и форма (maskShape) запечены в пиксели — их
// сбросить нельзя (только Cmd+Z), поэтому здесь не трогаем.
export function resetImageAdjust(slideId: string, shapeId: string): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'image') return;
    sh.recolor = undefined;
    sh.brightness = undefined;
    sh.contrast = undefined;
    sh.opacity = undefined;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Ставит / убирает Alt-текст (описание для доступности, Phase 3.7).
// Пустая строка → undefined (не засоряем JSON).
export function setShapeAltText(slideId: string, shapeId: string, text: string): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh) return;
    const trimmed = text.trim();
    sh.altText = trimmed === '' ? undefined : trimmed;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Ставит / убирает гиперссылку на указанной фигуре. `hl=undefined` снимает
// ссылку. Используется HyperlinkDialog.
export function setShapeHyperlink(
  slideId: string,
  shapeId: string,
  hl: import('@renderer/lib/model/schema').Hyperlink | undefined,
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh) return;
    if (hl) sh.hyperlink = hl;
    else delete sh.hyperlink;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// WordArt (Phase 3.21): правки текста/шрифта подгоняют bbox под натуральный
// размер текста (как при создании); цвет/контур bbox не трогают.
export function setWordArtStyle(
  slideId: string,
  shapeId: string,
  patch: { text?: string; fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean },
): void {
  useDeckStore.setState((state) => {
    const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'wordart') return;
    if (patch.text !== undefined) sh.text = patch.text;
    if (patch.fontFamily !== undefined) sh.fontFamily = patch.fontFamily;
    if (patch.fontSize !== undefined) sh.fontSize = patch.fontSize;
    if (patch.bold !== undefined) sh.bold = patch.bold;
    if (patch.italic !== undefined) sh.italic = patch.italic;
    const m = measureWordArt(sh.text, sh.fontFamily, sh.fontSize, sh.bold, sh.italic);
    sh.w = m.w;
    sh.h = m.h;
    if (state.deck) state.deck.modifiedAt = new Date().toISOString();
  });
}

export function setWordArtFill(slideId: string, shapeId: string, color: string): void {
  useDeckStore.setState((state) => {
    const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'wordart') return;
    sh.fill = { kind: 'solid', color };
    if (state.deck) state.deck.modifiedAt = new Date().toISOString();
  });
}

export function setWordArtStroke(
  slideId: string,
  shapeId: string,
  patch: { color?: string; width?: number },
): void {
  useDeckStore.setState((state) => {
    const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'wordart') return;
    const color = patch.color ?? sh.stroke?.color ?? '#0a2a66';
    const width = patch.width ?? sh.stroke?.width ?? 0;
    sh.stroke = width > 0 ? { color, width } : undefined;
    if (state.deck) state.deck.modifiedAt = new Date().toISOString();
  });
}

// Обновляет настройки номеров слайдов (§1.13). Прозрачно создаёт объект,
// если его ещё не было в деке.
export function setPageNumbers(enabled: boolean, skipFirst: boolean): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    state.deck.pageNumbers = { enabled, skipFirst };
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function toggleHiddenSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[activeId];
    if (!slide) return;
    slide.hidden = !slide.hidden;
    state.deck.modifiedAt = new Date().toISOString();
  });
}
