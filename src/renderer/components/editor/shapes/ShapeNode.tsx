import { useRef } from 'react';
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

// Универсальный wrapper для любой фигуры:
// - x/y в координатах слайда, дети рисуются от (0,0) до (w,h),
// - Group имеет stable `id` — Stage по нему находит shape при mousedown
//   и выделяет (см. Canvas.tsx handleStageMouseDown),
// - невидимый bbox-хитбокс ловит клики в углах, где нет геометрии фигуры,
// - drag обновляет позицию в deckStore. При multi-select (2+ фигуры выделено
//   и draggable — одна из них) — двигаем все вместе по дельте.
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

  // Старт group-drag-а: исходные позиции всех остальных selected-нод
  // (на момент начала drag-а текущей) + старт самой dragged-ноды.
  // Дельта считается от dragged.start — остальные двигаются на ту же дельту.
  const groupRef = useRef<{
    selfStart: { x: number; y: number };
    others: Array<{ id: ShapeId; node: Konva.Node; startX: number; startY: number }>;
  } | null>(null);

  // Запись позиции одной фигуры в стор. Опционально — синхронизация
  // Konva-ноды (нужно при snap-е, когда мы корректируем координату руками).
  const writePosition = (
    state: { deck: { slides: Record<string, { shapes: Array<{ id: ShapeId; x: number; y: number }> }>; modifiedAt: string } } | { deck: null },
    sid: ShapeId,
    nx: number,
    ny: number,
  ) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((s) => s.id === sid);
    if (sh) {
      sh.x = nx;
      sh.y = ny;
    }
  };

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const sel = useSelectionStore.getState().selectedShapeIds;
    if (sel.length < 2 || !sel.includes(id)) {
      groupRef.current = null;
      return;
    }
    const stage = e.target.getStage();
    if (!stage) return;
    const others: Array<{ id: ShapeId; node: Konva.Node; startX: number; startY: number }> = [];
    const wanted = new Set(sel);
    wanted.delete(id);
    stage.find((n: Konva.Node) => {
      if (wanted.has(n.id())) {
        others.push({ id: n.id() as ShapeId, node: n, startX: n.x(), startY: n.y() });
      }
      return false;
    });
    groupRef.current = {
      selfStart: { x: e.target.x(), y: e.target.y() },
      others,
    };
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nx = node.x();
    const ny = node.y();
    const group = groupRef.current;

    // Для самой dragged-фигуры пишем в стор каждый dragmove (Inspector live).
    // Для остальных в группе — двигаем только Konva-ноды императивно;
    // в стор коммитим один раз на dragend. Это работает потому, что
    // ShapeView-ы мемоизированы (React.memo), поэтому при immer-мутации
    // одной фигуры остальные не перерисовываются и Konva-ноды сохраняют
    // импертивно установленные координаты.
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === id);
      if (sh) {
        sh.x = nx;
        sh.y = ny;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });

    if (group) {
      const dx = nx - group.selfStart.x;
      const dy = ny - group.selfStart.y;
      for (const o of group.others) {
        o.node.x(o.startX + dx);
        o.node.y(o.startY + dy);
      }
      node.getLayer()?.batchDraw();
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();
    const group = groupRef.current;
    if (snapToGrid) {
      nextX = Math.round(nextX / 10) * 10;
      nextY = Math.round(nextY / 10) * 10;
    }
    useDeckStore.setState((state) => {
      writePosition(state as never, id, nextX, nextY);
      if (group) {
        const dx = nextX - group.selfStart.x;
        const dy = nextY - group.selfStart.y;
        for (const o of group.others) {
          const ox = snapToGrid ? Math.round((o.startX + dx) / 10) * 10 : o.startX + dx;
          const oy = snapToGrid ? Math.round((o.startY + dy) / 10) * 10 : o.startY + dy;
          writePosition(state as never, o.id, ox, oy);
          o.node.x(ox);
          o.node.y(oy);
        }
      }
      if (state.deck) state.deck.modifiedAt = new Date().toISOString();
    });
    if (node.x() !== nextX) node.x(nextX);
    if (node.y() !== nextY) node.y(nextY);
    groupRef.current = null;
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
      onDragStart={handleDragStart}
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
