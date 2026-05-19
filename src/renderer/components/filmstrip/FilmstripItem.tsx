import { memo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useDeckStore } from '@renderer/stores/deck';
import type { SlideId } from '@shared/types';

interface FilmstripItemProps {
  slideId: SlideId;
  index: number;
  active: boolean;
  onSelect: (id: SlideId) => void;
  onReorder: (draggedId: string, dropTargetId: string) => void;
}

// Один элемент filmstrip-а: номер слайда + упрощённое превью.
// Превью — это absolute-позиционированные DIV-ы, рендерящие
// прямоугольный bbox каждой фигуры с цветом fill / stroke. Это даёт
// «карту» расположения объектов, без честной растеризации содержимого.
// Honest thumbnail-PNG через OffscreenCanvas+Worker — §6.9, Phase 3+.
export const FilmstripItem = memo(function FilmstripItemBase({
  slideId,
  index,
  active,
  onSelect,
  onReorder,
}: FilmstripItemProps) {
  const [dropTarget, setDropTarget] = useState(false);
  const slide = useDeckStore(
    useShallow((s) => {
      const sl = s.deck?.slides[slideId];
      if (!sl) return null;
      return {
        bg: sl.background?.type === 'color' ? sl.background.color : '#ffffff',
        shapes: sl.shapes.map((sh) => ({
          id: sh.id,
          x: sh.x,
          y: sh.y,
          w: sh.w,
          h: sh.h,
          type: sh.type,
          fillColor: sh.fill?.kind === 'solid' ? sh.fill.color : null,
          strokeColor: sh.stroke?.color ?? null,
        })),
      };
    }),
  );
  const slideW = useDeckStore((s) => s.deck?.size.w ?? 1920);
  const slideH = useDeckStore((s) => s.deck?.size.h ?? 1080);

  if (!slide) return null;

  return (
    <div
      className={`fs-item${active ? ' fs-item--active' : ''}${dropTarget ? ' fs-item--drop' : ''}`}
      draggable
      onClick={() => onSelect(slideId)}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-slide-id', slideId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        const draggedId = e.dataTransfer.types.includes('text/x-slide-id');
        if (!draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dropTarget) setDropTarget(true);
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropTarget(false);
        const draggedId = e.dataTransfer.getData('text/x-slide-id');
        if (draggedId && draggedId !== slideId) onReorder(draggedId, slideId);
      }}
    >
      <div className="fs-item__num">{index + 1}</div>
      <div className="fs-item__preview" style={{ background: slide.bg }}>
        {slide.shapes.map((sh) => (
          <div
            key={sh.id}
            className="fs-item__shape"
            style={{
              left: `${(sh.x / slideW) * 100}%`,
              top: `${(sh.y / slideH) * 100}%`,
              width: `${(sh.w / slideW) * 100}%`,
              height: `${(sh.h / slideH) * 100}%`,
              background: sh.fillColor ?? 'transparent',
              borderColor: sh.strokeColor ?? 'transparent',
              borderRadius: sh.type === 'ellipse' ? '50%' : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
});
