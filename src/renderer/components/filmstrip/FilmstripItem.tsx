import { memo, useState } from 'react';
import Konva from 'konva';
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

// Ширина preview-области в filmstrip-е (CSS, без учёта DPI). Внутрь рендерим
// фигуры в нативных slide-coords и масштабируем весь блок через CSS-transform.
// Это даёт пиксель-перфектное пропорциональное превью текста и других фигур,
// без отдельной растеризации (Konva/OffscreenCanvas — Phase 3+).
const THUMB_W = 140;

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
  const scale = THUMB_W / slideW;
  const thumbH = slideH * scale;

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
      <div
        className="fs-item__preview"
        style={{ width: THUMB_W, height: thumbH, background: bg }}
      >
        {/* Внутренний слой 1920×1080 (или какой реально slide) — здесь
            фигуры в их «настоящих» координатах. CSS scale уменьшает всё
            до thumb-размера. Текст рендерится в реальном font-size, поэтому
            масштаб шрифта 1:1 с канвасом. */}
        <div
          className="fs-item__inner"
          style={{
            width: slideW,
            height: slideH,
            transform: `scale(${scale})`,
          }}
        >
          {slide.shapes.map((sh) => {
            const fill = solidColor(sh.fill);
            const stroke = sh.stroke?.color ?? null;
            const plain =
              sh.type === 'text'
                ? extractPlain(sh.tiptapDoc)
                : extractPlain(sh.text);
            if (sh.type === 'line') {
              return (
                <div
                  key={sh.id}
                  className="fs-item__shape fs-item__line"
                  style={{
                    left: sh.x,
                    top: sh.y + sh.h / 2,
                    width: sh.w,
                    height: Math.max(1, sh.stroke?.width ?? 1),
                    background: stroke ?? '#5f6368',
                  }}
                />
              );
            }
            if (sh.type === 'path') {
              const natural = pathNaturalBox(sh.pathData);
              return (
                <svg
                  key={sh.id}
                  className="fs-item__shape"
                  style={{
                    left: sh.x,
                    top: sh.y,
                    width: sh.w,
                    height: sh.h,
                    overflow: 'visible',
                  }}
                  viewBox={`${natural.x} ${natural.y} ${natural.w} ${natural.h}`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={sh.pathData}
                    fill={fill ?? 'none'}
                    stroke={stroke ?? '#5f6368'}
                    strokeWidth={sh.stroke?.width ?? 2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              );
            }
            return (
              <div
                key={sh.id}
                className="fs-item__shape"
                style={{
                  left: sh.x,
                  top: sh.y,
                  width: sh.w,
                  height: sh.h,
                  background: fill ?? 'transparent',
                  borderColor: stroke ?? 'transparent',
                  borderWidth: stroke ? sh.stroke?.width ?? 1 : 0,
                  borderRadius: sh.type === 'ellipse' ? '50%' : 0,
                }}
              >
                {plain && <span className="fs-item__text">{plain}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// Натуральный bbox SVG-данных пути — повторяет логику PathShapeView, чтобы
// preserveAspectRatio="none" в SVG корректно ровно растянул кривую на bbox
// фигуры (как Konva.Path в основной отрисовке).
const pathBoxCache = new Map<string, { x: number; y: number; w: number; h: number }>();
function pathNaturalBox(data: string): { x: number; y: number; w: number; h: number } {
  const cached = pathBoxCache.get(data);
  if (cached) return cached;
  const tmp = new Konva.Path({ data });
  const rect = tmp.getSelfRect();
  const box = {
    x: rect.x,
    y: rect.y,
    w: Math.max(1, rect.width),
    h: Math.max(1, rect.height),
  };
  pathBoxCache.set(data, box);
  return box;
}

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
