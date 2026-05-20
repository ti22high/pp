import { useEffect } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';

// Перемещение выделенных фигур стрелками: 1 px за нажатие, Shift → 10 px.
// Escape — снять выделение. Игнорирует события из текстовых полей и когда
// открыт текстовый оверлей (там стрелки двигают каретку).
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

const ARROW_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

export function useArrowNudge(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInTextField(e.target)) return;
      // Когда редактируется текст — стрелки не трогаем.
      if (useUiStore.getState().editingShapeId) return;

      if (e.key === 'Escape') {
        const sel = useSelectionStore.getState();
        if (sel.selectedShapeIds.length > 0) {
          e.preventDefault();
          sel.clear();
        }
        return;
      }

      const delta = ARROW_DELTA[e.key];
      if (!delta) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const sel = useSelectionStore.getState().selectedShapeIds;
      if (sel.length === 0) return;
      const slideId = useUiStore.getState().activeSlideId;
      if (!slideId) return;

      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = delta.dx * step;
      const dy = delta.dy * step;
      const selSet = new Set(sel);
      useDeckStore.setState((state) => {
        if (!state.deck) return;
        const slide = state.deck.slides[slideId];
        if (!slide) return;
        for (const sh of slide.shapes) {
          if (selSet.has(sh.id)) {
            sh.x += dx;
            sh.y += dy;
          }
        }
        state.deck.modifiedAt = new Date().toISOString();
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
