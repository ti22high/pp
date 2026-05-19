import { useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useShallow } from 'zustand/shallow';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { FilmstripItem } from './FilmstripItem';

// Левая панель слайдов с виртуализацией (react-virtuoso) и drag-reorder.
// Thumbnail-превью — упрощённое, на CSS (см. FilmstripItem). Полноценный
// рендер слайдов в PNG через OffscreenCanvas + Worker — §6.9, Phase 3+.
export function Filmstrip() {
  const slideOrder = useDeckStore(useShallow((s) => s.deck?.slideOrder ?? []));
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const setActiveSlide = useUiStore((s) => s.setActiveSlide);

  const onReorder = useCallback((draggedId: string, dropTargetId: string) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const order = state.deck.slideOrder;
      const fromIdx = order.indexOf(draggedId);
      const toIdx = order.indexOf(dropTargetId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, draggedId);
      state.deck.modifiedAt = new Date().toISOString();
    });
  }, []);

  return (
    <aside className="app-filmstrip">
      <p className="panel-title">Слайды ({slideOrder.length})</p>
      <Virtuoso
        style={{ height: 'calc(100% - 24px)' }}
        data={slideOrder}
        itemContent={(index, slideId) => (
          <FilmstripItem
            slideId={slideId}
            index={index}
            active={slideId === activeSlideId}
            onSelect={setActiveSlide}
            onReorder={onReorder}
          />
        )}
      />
    </aside>
  );
}
