import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { ReactNode } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
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

// Универсальный wrapper для любой фигуры:
// - x/y в координатах слайда, дети рисуются от (0,0) до (w,h),
// - Group имеет stable `id` — Stage по нему находит shape при mousedown
//   и выделяет (см. Canvas.tsx handleStageMouseDown),
// - невидимый bbox-хитбокс ловит клики в углах, где нет геометрии фигуры,
// - drag обновляет позицию в deckStore.
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
  const snapToGrid = useUiStore((s) => s.snapToGrid);

  // Live-апдейт позиции в стор на каждый dragmove (Inspector видит координаты
  // в реальном времени). Snap к сетке применяем только на dragend, иначе
  // движение будет дёргаться по 10 px.
  const writePosition = (node: Konva.Node, x: number, y: number) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === id);
      if (sh) {
        sh.x = x;
        sh.y = y;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
    // Корректируем DOM-ноду на случай snap-а, не вызывая лишний batchDraw.
    if (node.x() !== x) node.x(x);
    if (node.y() !== y) node.y(y);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    writePosition(node, node.x(), node.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();
    if (snapToGrid) {
      nextX = Math.round(nextX / 10) * 10;
      nextY = Math.round(nextY / 10) * 10;
    }
    writePosition(node, nextX, nextY);
  };

  return (
    <Group
      id={id}
      name="shape-root"
      x={x}
      y={y}
      width={w}
      height={h}
      rotation={rotation ?? 0}
      opacity={opacity ?? 1}
      draggable={!locked}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Невидимый bbox-хитбокс: чёрный fill + минимальная opacity, чтобы
          Konva включила его в hit-detection (полностью прозрачные ноды Konva пропускает). */}
      <Rect x={0} y={0} width={w} height={h} fill="#000" opacity={0.001} />
      {children}
    </Group>
  );
}
