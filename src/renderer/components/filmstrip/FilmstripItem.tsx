import { memo, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import type { SlideId } from '@shared/types';
import type { Fill } from '@renderer/lib/model/schema';

interface FilmstripItemProps {
  slideId: SlideId;
  index: number;
  active: boolean;
  onSelect: (id: SlideId) => void;
  onReorder: (draggedId: string, dropTargetId: string) => void;
}

// Один элемент filmstrip-а: номер слайда + упрощённое превью.
// Подписываемся НА весь slide-объект — immer хранит стабильную ссылку,
// пока слайд не меняется, поэтому re-render будет только при реальных
// мутациях. useShallow тут не подходит — внутренний массив shapes
// деривируется каждый рендер, и сравнение по верхнему уровню зацикливалось.
export const FilmstripItem = memo(function FilmstripItemBase({
  slideId,
  index,
  active,
  onSelect,
  onReorder,
}: FilmstripItemProps) {
  const [dropTarget, setDropTarget] = useState(false);
  const slide = useDeckStore((s) => s.deck?.slides[slideId] ?? null);
  const slideW = useDeckStore((s) => s.deck?.size.w ?? 1920);
  const slideH = useDeckStore((s) => s.deck?.size.h ?? 1080);

  if (!slide) return null;
  const bg =
    slide.background?.type === 'color' ? slide.background.color : '#ffffff';

  return (
    <div
      className={`fs-item${active ? ' fs-item--active' : ''}${dropTarget ? ' fs-item--drop' : ''}${slide.hidden ? ' fs-item--hidden' : ''}`}
      draggable
      onClick={() => onSelect(slideId)}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-slide-id', slideId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('text/x-slide-id')) return;
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
      <div className="fs-item__preview" style={{ background: bg }}>
        {slide.shapes.map((sh) => {
          const fill = solidColor(sh.fill);
          const stroke = sh.stroke?.color ?? null;
          // Текст / прочие фигуры без видимой заливки и обводки — показываем
          // плашкой светло-серой, чтобы в превью было видно «там что-то есть».
          const isInvisible = !fill && !stroke;
          return (
            <div
              key={sh.id}
              className="fs-item__shape"
              style={{
                left: `${(sh.x / slideW) * 100}%`,
                top: `${(sh.y / slideH) * 100}%`,
                width: `${(sh.w / slideW) * 100}%`,
                height: `${(sh.h / slideH) * 100}%`,
                background: fill ?? (isInvisible ? 'rgba(95, 99, 104, 0.18)' : 'transparent'),
                borderColor: stroke ?? 'transparent',
                borderRadius: sh.type === 'ellipse' ? '50%' : 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});

function solidColor(fill: Fill | undefined): string | null {
  if (!fill) return null;
  if (fill.kind === 'solid') return fill.color;
  return null;
}
