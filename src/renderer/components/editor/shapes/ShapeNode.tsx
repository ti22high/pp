import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { ReactNode } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import type { ShapeId } from '@shared/types';

interface ShapeNodeProps {
  id: ShapeId;
  slideId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  // Дочерние Konva-ноды рисуются в локальных координатах от (0, 0) до (w, h).
  children: ReactNode;
}

// Универсальный wrapper для любой фигуры. Решает три задачи:
// 1) Унифицированная модель координат: x/y — top-left bbox в системе слайда;
//    геометрия внутри (rect, ellipse, line, path) рисуется в локальных
//    координатах (0..w, 0..h) — Transformer работает корректно для всех типов.
// 2) Хитбокс по bbox: чёрный Rect с opacity 0.001 (визуально невидим,
//    но Konva считает его участвующим в hit-тесте). Полностью прозрачный
//    fill ("transparent" или opacity=0) Konva пропускает.
// 3) Select при mousedown (не click) — поведение как в Slides/PowerPoint:
//    выделение происходит сразу при нажатии, даже если мышь чуть-чуть сдвинулась.
export function ShapeNode({
  id,
  slideId,
  x,
  y,
  w,
  h,
  rotation,
  opacity,
  locked,
  children,
}: ShapeNodeProps) {
  const select = useSelectionStore((s) => s.select);
  const snapToGrid = useUiStore((s) => s.snapToGrid);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();
    if (snapToGrid) {
      nextX = Math.round(nextX / 10) * 10;
      nextY = Math.round(nextY / 10) * 10;
      node.x(nextX);
      node.y(nextY);
    }
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === id);
      if (sh) {
        sh.x = nextX;
        sh.y = nextY;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const handleSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    select([id]);
  };

  return (
    <Group
      id={id}
      x={x}
      y={y}
      width={w}
      height={h}
      rotation={rotation ?? 0}
      opacity={opacity ?? 1}
      draggable={!locked}
      onDragEnd={handleDragEnd}
      onMouseDown={handleSelect}
      onTouchStart={handleSelect}
    >
      {/* Невидимый хитбокс по bbox.
          fill="#000" + opacity 0.001: визуально незаметно, но Konva
          считает ноду «не прозрачной» и включает её в hit-detection. */}
      <Rect x={0} y={0} width={w} height={h} fill="#000" opacity={0.001} />
      {children}
    </Group>
  );
}
