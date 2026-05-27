// Вставка фигур по центру активного слайда (Phase 3). Общие точки для кнопок
// тулбара и пунктов меню «Вставка», чтобы поведение совпадало.

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createText, createChart, createLine } from '@renderer/lib/model/factory';
import type { Shape } from '@renderer/lib/model/schema';

function centerXY(w: number, h: number): { x: number; y: number } {
  const deck = useDeckStore.getState().deck;
  const dw = deck?.size.w ?? 1920;
  const dh = deck?.size.h ?? 1080;
  return { x: Math.round(dw / 2 - w / 2), y: Math.round(dh / 2 - h / 2) };
}

function doInsert(shape: Shape): void {
  const deck = useDeckStore.getState().deck;
  const slideId = useUiStore.getState().activeSlideId;
  if (!deck || !slideId) return;
  useDeckStore.getState().setDeck(appendShape(deck, slideId, shape));
  useSelectionStore.getState().select([shape.id]);
}

export function insertText(): void {
  const c = centerXY(480, 80);
  doInsert(createText(c.x, c.y, 480, 80, 'Введите текст'));
}

export function insertChart(): void {
  const c = centerXY(640, 400);
  doInsert(createChart(c.x, c.y, 640, 400));
}

export function insertLine(): void {
  const c = centerXY(240, 20);
  doInsert(createLine(c.x, c.y, 240, 0));
}
