import { useDeckStore } from '@renderer/stores/deck';
import { setShapeBookmark } from '@renderer/lib/slides';
import type { ShapeId, SlideId } from '@shared/types';

interface BookmarkInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция «Закладка» (Phase 3.22) — доступна для любой фигуры. Заданное имя
// делает фигуру якорем: на неё можно сослаться в диалоге гиперссылки
// (kind:'bookmark'). Пустое поле убирает закладку.
export function BookmarkInspector({ slideId, shapeId }: BookmarkInspectorProps) {
  const bookmark = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.bookmark ?? '';
  });

  return (
    <section className="inspector-section">
      <p className="panel-title">Закладка</p>
      <label className="inspector-row">
        <span className="inspector-label">Имя</span>
        <input
          type="text"
          className="inspector-input"
          value={bookmark}
          placeholder="нет"
          onChange={(e) => setShapeBookmark(slideId, shapeId, e.target.value)}
        />
      </label>
    </section>
  );
}
