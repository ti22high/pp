import { useEffect } from 'react';
import { useUiStore } from '@renderer/stores/ui';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { alignShapes, distributeShapes, type AlignKind } from '@renderer/lib/align';
import { reorderZ, type ZOrderKind } from '@renderer/lib/zorder';
import { canGroup, canUngroup } from '@renderer/lib/group';
import { undo, redo } from '@renderer/lib/undo';

// Подписка на команды native-меню (Файл / Правка / Вид / …) и роутинг их
// в соответствующие store-действия. Команды приходят строкой через
// contextBridge → `window.api.onMenuCommand`.
//
// view:zoom-in/out/reset обрабатываются в Canvas — там есть stageSize и
// логика пивота вокруг центра канваса. Поэтому здесь только toggles +
// arrange:* (align/distribute).
export function useMenuCommands() {
  const toggleGrid = useUiStore((s) => s.toggleGrid);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  const toggleSnapToGrid = useUiStore((s) => s.toggleSnapToGrid);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    const unsubscribe = window.api.onMenuCommand((command) => {
      switch (command) {
        case 'view:toggle-grid':
          toggleGrid();
          break;
        case 'view:toggle-snap-grid':
          toggleSnapToGrid();
          break;
        case 'view:toggle-ruler':
          toggleRuler();
          break;
        case 'arrange:align-left':
        case 'arrange:align-center-h':
        case 'arrange:align-right':
        case 'arrange:align-top':
        case 'arrange:align-middle':
        case 'arrange:align-bottom':
          applyAlign(command.split(':')[1].replace(/^align-/, '') as AlignKind);
          break;
        case 'arrange:distribute-h':
          applyDistribute('horizontal');
          break;
        case 'arrange:distribute-v':
          applyDistribute('vertical');
          break;
        case 'arrange:to-front':
        case 'arrange:forward':
        case 'arrange:backward':
        case 'arrange:to-back':
          applyZOrder(command.split(':')[1] as ZOrderKind);
          break;
        case 'arrange:group':
          applyGroup();
          break;
        case 'arrange:ungroup':
          applyUngroup();
          break;
        case 'edit:undo':
          undo();
          break;
        case 'edit:redo':
          redo();
          break;
        default:
          // Остальные команды обрабатываются в своих компонентах
          // (Canvas — zoom, File-меню — Phase 5, и т.д.).
          break;
      }
    });
    return unsubscribe;
  }, [toggleGrid, toggleRuler, toggleSnapToGrid]);
}

// Применяет align/distribute к текущему выделению.
// Snap-к-сетке игнорируется — пользователь явно запросил выравнивание,
// и сетка здесь только помешает.
function applyAlign(kind: AlignKind) {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length < 2) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const selected = slide.shapes.filter((s) => sel.includes(s.id));
    const moves = alignShapes(selected, kind);
    for (const sh of slide.shapes) {
      const m = moves.get(sh.id);
      if (m) {
        sh.x = m.x;
        sh.y = m.y;
      }
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

function applyGroup() {
  const sel = useSelectionStore.getState().selectedShapeIds;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId || sel.length < 2) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    if (!canGroup(sel, slide.shapes)) return;
    // Новый groupId на всех выбранных. Если кто-то уже был в другой группе —
    // он «переезжает» в новую (старая группа теряет одного члена; если в ней
    // остаётся 1 фигура, она де-факто перестаёт быть группой).
    const newGroupId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const idSet = new Set(sel);
    for (const sh of slide.shapes) {
      if (idSet.has(sh.id)) sh.groupId = newGroupId;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}

function applyUngroup() {
  const sel = useSelectionStore.getState().selectedShapeIds;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId || sel.length === 0) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    if (!canUngroup(sel, slide.shapes)) return;
    // Собираем groupId-ы, которые «зацеплены» выделением, и стираем groupId
    // у всех фигур этих групп (даже если те не были в выделении).
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

function applyZOrder(kind: ZOrderKind) {
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
    // Перестраиваем массив shape-объектов в новом порядке.
    const byId = new Map(slide.shapes.map((s) => [s.id, s] as const));
    slide.shapes = newOrder.map((id) => byId.get(id)!).filter(Boolean);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

function applyDistribute(kind: 'horizontal' | 'vertical') {
  const sel = useSelectionStore.getState().selectedShapeIds;
  if (sel.length < 3) return;
  const slideId = useUiStore.getState().activeSlideId;
  if (!slideId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const selected = slide.shapes.filter((s) => sel.includes(s.id));
    const moves = distributeShapes(selected, kind);
    for (const sh of slide.shapes) {
      const m = moves.get(sh.id);
      if (m) {
        sh.x = m.x;
        sh.y = m.y;
      }
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
}
