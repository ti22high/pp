// Операции с фигурами на канвасе: copy / cut / paste / duplicate /
// delete / selectAll. Вынесены в отдельный модуль, чтобы их могли вызывать
// и keyboard-хук (useShapeClipboard), и меню-обработчики (useMenuCommands).

import { v4 as uuid } from 'uuid';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { useClipboardStore } from '@renderer/stores/clipboard';
import type { Shape } from '@renderer/lib/model/schema';
import type { ShapeId } from '@shared/types';

const PASTE_OFFSET = 20;

export function copy(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  const deck = useDeckStore.getState().deck;
  if (!deck) return;
  const slide = deck.slides[slideId];
  if (!slide) return;
  const idSet = new Set(sel);
  const shapes = slide.shapes
    .filter((s) => idSet.has(s.id))
    .map((s) => structuredClone(s));
  useClipboardStore.getState().set(shapes);
}

export function cut(): void {
  copy();
  deleteSelected();
}

export function paste(): void {
  const clipboard = useClipboardStore.getState().shapes;
  if (clipboard.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  const { idMap, groupMap } = buildRemap(clipboard);
  const newShapes: Shape[] = clipboard.map((sh) => ({
    ...structuredClone(sh),
    id: idMap.get(sh.id)!,
    x: sh.x + PASTE_OFFSET,
    y: sh.y + PASTE_OFFSET,
    groupId: sh.groupId ? groupMap.get(sh.groupId) : undefined,
  }));
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    slide.shapes.push(...newShapes);
    state.deck.modifiedAt = new Date().toISOString();
  });
  useSelectionStore.getState().select(newShapes.map((s) => s.id));
}

export function duplicate(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  const deck = useDeckStore.getState().deck;
  if (!deck) return;
  const slide = deck.slides[slideId];
  if (!slide) return;
  const idSet = new Set(sel);
  const sourceShapes = slide.shapes.filter((s) => idSet.has(s.id));
  const { idMap, groupMap } = buildRemap(sourceShapes);
  const newShapes: Shape[] = sourceShapes.map((sh) => ({
    ...structuredClone(sh),
    id: idMap.get(sh.id)!,
    x: sh.x + PASTE_OFFSET,
    y: sh.y + PASTE_OFFSET,
    groupId: sh.groupId ? groupMap.get(sh.groupId) : undefined,
  }));
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const sl = state.deck.slides[slideId];
    if (!sl) return;
    sl.shapes.push(...newShapes);
    state.deck.modifiedAt = new Date().toISOString();
  });
  useSelectionStore.getState().select(newShapes.map((s) => s.id));
}

export function deleteSelected(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const idSet = new Set(sel);
    slide.shapes = slide.shapes.filter((s) => !idSet.has(s.id));
    state.deck.modifiedAt = new Date().toISOString();
  });
  useSelectionStore.getState().clear();
}

export function selectAll(): void {
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  const deck = useDeckStore.getState().deck;
  if (!deck) return;
  const slide = deck.slides[slideId];
  if (!slide) return;
  useSelectionStore.getState().select(slide.shapes.map((s) => s.id));
}

// Утилита: новые id для фигур + переотображение groupId-ов
// (копия группы остаётся группой, но отдельной от оригинала).
function buildRemap(shapes: readonly Shape[]) {
  const idMap = new Map<ShapeId, ShapeId>();
  const groupMap = new Map<string, string>();
  for (const sh of shapes) idMap.set(sh.id, uuid());
  for (const sh of shapes) {
    if (sh.groupId && !groupMap.has(sh.groupId)) {
      groupMap.set(
        sh.groupId,
        `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      );
    }
  }
  return { idMap, groupMap };
}
