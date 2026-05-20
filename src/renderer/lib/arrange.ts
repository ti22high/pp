// Команды расположения фигур (z-order, group/ungroup), общие для native-меню
// (useMenuCommands) и контекстного меню (ShapeContextMenu). Раньше жили
// приватно в useMenuCommands — вынесены, чтобы не дублировать.

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { reorderZ, type ZOrderKind } from '@renderer/lib/zorder';
import { canGroup, canUngroup } from '@renderer/lib/group';

export function applyZOrder(kind: ZOrderKind): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length === 0) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const currentOrder = slide.shapes.map((s) => s.id);
    const newOrder = reorderZ(currentOrder, sel, kind);
    const byId = new Map(slide.shapes.map((s) => [s.id, s] as const));
    slide.shapes = newOrder.map((id) => byId.get(id)!).filter(Boolean);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function applyGroup(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId || sel.length < 2) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    if (!canGroup(sel, slide.shapes)) return;
    const newGroupId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const idSet = new Set(sel);
    for (const sh of slide.shapes) {
      if (idSet.has(sh.id)) sh.groupId = newGroupId;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function applyUngroup(): void {
  const sel = useSelectionStore.getState().selectedShapeIds;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId || sel.length === 0) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    if (!canUngroup(sel, slide.shapes)) return;
    const idSet = new Set(sel);
    const groupsToBreak = new Set<string>();
    for (const sh of slide.shapes) {
      if (idSet.has(sh.id) && sh.groupId) groupsToBreak.add(sh.groupId);
    }
    for (const sh of slide.shapes) {
      if (sh.groupId && groupsToBreak.has(sh.groupId)) {
        sh.groupId = undefined;
      }
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}
