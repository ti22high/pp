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
          const plain =
            sh.type === 'text'
              ? extractPlain(sh.tiptapDoc)
              : extractPlain(sh.text);
          // Линию рисуем как тонкий 1.5px бар по центру её bbox (а не на всю
          // высоту bbox-а — иначе в превью выглядит как толстая полоса).
          if (sh.type === 'line') {
            return (
              <div
                key={sh.id}
                className="fs-item__shape fs-item__line"
                style={{
                  left: `${(sh.x / slideW) * 100}%`,
                  top: `${((sh.y + sh.h / 2) / slideH) * 100}%`,
                  width: `${(sh.w / slideW) * 100}%`,
                  background: stroke ?? '#5f6368',
                }}
              />
            );
          }
          return (
            <div
              key={sh.id}
              className="fs-item__shape"
              style={{
                left: `${(sh.x / slideW) * 100}%`,
                top: `${(sh.y / slideH) * 100}%`,
                width: `${(sh.w / slideW) * 100}%`,
                height: `${(sh.h / slideH) * 100}%`,
                background: fill ?? 'transparent',
                borderColor: stroke ?? 'transparent',
                borderRadius: sh.type === 'ellipse' ? '50%' : 0,
              }}
            >
              {plain && <span className="fs-item__text">{plain}</span>}
            </div>
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

function extractPlain(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') {
      out.push(n.text);
      return;
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
      if (n.type === 'paragraph' || n.type === 'heading') out.push(' ');
    }
  };
  walk(doc);
  return out.join('').trim();
}
