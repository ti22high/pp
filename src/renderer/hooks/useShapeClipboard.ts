import { useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { useClipboardStore } from '@renderer/stores/clipboard';
import type { Shape } from '@renderer/lib/model/schema';
import type { ShapeId } from '@shared/types';

// Cmd/Ctrl+C / X / V / D для фигур на канвасе.
// Игнорирует события из text-input / contenteditable, чтобы не конфликтовать
// с нативным копированием/вставкой текста в Inspector-полях и TipTap-оверлее.
//
// Внутренний буфер обмена (useClipboardStore) — изолирован от OS-clipboard.
// При paste фигуры получают новые id + сдвиг на 20px, чтобы не накладывались
// на оригинал.

const PASTE_OFFSET = 20;

function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function useShapeClipboard() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isInTextField(e.target)) return; // нативный копи-паст текста
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        copy();
      } else if (key === 'x') {
        e.preventDefault();
        cut();
      } else if (key === 'v') {
        e.preventDefault();
        paste();
      } else if (key === 'd') {
        e.preventDefault();
        duplicate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function copy(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  const deck = useDeckStore.getState().deck;
  if (!deck) return;
  const slide = deck.slides[slideId];
  if (!slide) return;
  const idSet = new Set(sel);
  // Сериализуем deep-copy (structuredClone подойдёт — все наши данные plain JSON).
  const shapes = slide.shapes
    .filter((s) => idSet.has(s.id))
    .map((s) => structuredClone(s));
  useClipboardStore.getState().set(shapes);
}

function cut(): void {
  copy();
  deleteSelected();
}

function paste(): void {
  const clipboard = useClipboardStore.getState().shapes;
  if (clipboard.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  // Маппинг старых id → новых для re-link group-id-ов между копиями.
  const idMap = new Map<ShapeId, ShapeId>();
  const groupMap = new Map<string, string>();
  for (const sh of clipboard) idMap.set(sh.id, uuid());
  for (const sh of clipboard) {
    if (sh.groupId && !groupMap.has(sh.groupId)) {
      groupMap.set(sh.groupId, `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
    }
  }
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
  // Выделяем только что вставленные.
  useSelectionStore.getState().select(newShapes.map((s) => s.id));
}

function duplicate(): void {
  // Эквивалент copy + paste, но без затирания пользовательского clipboard:
  // используем временный snapshot и сразу вставляем.
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
  const idMap = new Map<ShapeId, ShapeId>();
  const groupMap = new Map<string, string>();
  for (const sh of sourceShapes) idMap.set(sh.id, uuid());
  for (const sh of sourceShapes) {
    if (sh.groupId && !groupMap.has(sh.groupId)) {
      groupMap.set(sh.groupId, `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
    }
  }
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

function deleteSelected(): void {
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
