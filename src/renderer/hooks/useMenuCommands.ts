import { useEffect } from 'react';
import { useUiStore } from '@renderer/stores/ui';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { alignShapes, distributeShapes, type AlignKind } from '@renderer/lib/align';
import { type ZOrderKind } from '@renderer/lib/zorder';
import { applyZOrder, applyGroup, applyUngroup } from '@renderer/lib/arrange';
import { undo, redo } from '@renderer/lib/undo';
import { selectAll as selectAllShapes, duplicate as duplicateShapes } from '@renderer/lib/clipboard';
import { newSlide, duplicateSlide, deleteSlide, toggleHiddenSlide } from '@renderer/lib/slides';
import { addUserGuide, clearUserGuides } from '@renderer/lib/userGuides';

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
        case 'view:add-guide-h':
          addUserGuide('h');
          break;
        case 'view:add-guide-v':
          addUserGuide('v');
          break;
        case 'view:clear-guides':
          clearUserGuides();
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
        case 'edit:select-all':
          selectAllShapes();
          break;
        case 'edit:duplicate':
          duplicateShapes();
          break;
        case 'slide:new':
          newSlide();
          break;
        case 'slide:duplicate':
          duplicateSlide();
          break;
        case 'slide:delete':
          deleteSlide();
          break;
        case 'slide:toggle-hidden':
          toggleHiddenSlide();
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
