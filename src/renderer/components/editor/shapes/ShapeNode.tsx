import { Group, Shape as KonvaShape } from 'react-konva';
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
// 2) Хитбокс по bbox: специальная Konva.Shape с пустым sceneFunc и hitFunc,
//    рисующим bbox-прямоугольник, ловит клики по всей площади фигуры,
//    включая «пустые» углы (как в PowerPoint/Slides).
// 3) Drag и select-обработка одним местом, не дублируется в каждом ShapeView.
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
      onClick={(e) => {
        e.cancelBubble = true;
        select([id]);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        select([id]);
      }}
    >
      {/* Невидимый хитбокс на весь bbox.
          sceneFunc пустой → ничего не рисуется в видимом canvas.
          hitFunc заполняет hit-canvas прямоугольником w×h → любой клик в bbox
          ловит эта shape и event поднимается до Group. */}
      <KonvaShape
        x={0}
        y={0}
        width={w}
        height={h}
        sceneFunc={() => {}}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(0, 0, shape.width(), shape.height());
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#000"
      />
      {children}
    </Group>
  );
}
