import { useState, type ReactNode } from 'react';
import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { gridLines, tableOps } from '@renderer/lib/table';

// Минимальный размер строки/колонки при ресайзе (slide-px).
const MIN_CELL = 16;
// Толщина невидимой зоны захвата границы.
const HANDLE_HIT = 10;

interface TableResizeOverlayProps {
  slideId: string;
}

// Ручки ресайза колонок/строк выделенной таблицы. Рендерятся на ВЕРХНЕМ слое
// Stage (рядом с SelectionTransformer), а НЕ внутри draggable-группы таблицы —
// иначе Konva при перетаскивании ручки дёргает заодно и саму таблицу. Слой
// разделяет scaleX/scaleY/pan со слоем слайда, поэтому координаты — те же
// slide-coords: ручки кладём в Group со смещением на shape.x/shape.y.
export function TableResizeOverlay({ slideId }: TableResizeOverlayProps) {
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);
  const shape = useDeckStore((s) => {
    if (selectedIds.length !== 1) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === selectedIds[0]);
    return sh?.type === 'table' ? sh : null;
  });
  const [dragging, setDragging] = useState<string | null>(null);

  if (!shape) return null;

  const { colX, rowY } = gridLines(shape);
  const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, cur: string) => {
    const c = e.target.getStage()?.container();
    if (c) c.style.cursor = cur;
  };

  const handles: ReactNode[] = [];
  for (let i = 1; i < shape.cols; i++) {
    const key = `v${i}`;
    const clampX = (x: number) => {
      const g = gridLines(shape);
      return Math.max(g.colX[i - 1] + MIN_CELL, Math.min(g.colX[i + 1] - MIN_CELL, x));
    };
    handles.push(
      <Group
        key={key}
        x={colX[i]}
        y={0}
        draggable
        onMouseEnter={(e) => setCursor(e, 'col-resize')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragStart={() => setDragging(key)}
        onDragMove={(e) => {
          const node = e.target;
          node.y(0);
          node.x(clampX(node.x()));
        }}
        onDragEnd={(e) => {
          const g = gridLines(shape);
          const b = clampX(e.target.x());
          const fr = [...shape.colFractions];
          fr[i - 1] = (b - g.colX[i - 1]) / shape.w;
          fr[i] = (g.colX[i + 1] - b) / shape.w;
          setDragging(null);
          tableOps.setColFractions(slideId, shape.id, fr);
        }}
      >
        <Rect x={-HANDLE_HIT / 2} y={0} width={HANDLE_HIT} height={shape.h} />
        {dragging === key && (
          <Rect x={-1} y={0} width={2} height={shape.h} fill="#1a73e8" listening={false} />
        )}
      </Group>,
    );
  }
  for (let i = 1; i < shape.rows; i++) {
    const key = `h${i}`;
    const clampY = (y: number) => {
      const g = gridLines(shape);
      return Math.max(g.rowY[i - 1] + MIN_CELL, Math.min(g.rowY[i + 1] - MIN_CELL, y));
    };
    handles.push(
      <Group
        key={key}
        x={0}
        y={rowY[i]}
        draggable
        onMouseEnter={(e) => setCursor(e, 'row-resize')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragStart={() => setDragging(key)}
        onDragMove={(e) => {
          const node = e.target;
          node.x(0);
          node.y(clampY(node.y()));
        }}
        onDragEnd={(e) => {
          const g = gridLines(shape);
          const b = clampY(e.target.y());
          const fr = [...shape.rowFractions];
          fr[i - 1] = (b - g.rowY[i - 1]) / shape.h;
          fr[i] = (g.rowY[i + 1] - b) / shape.h;
          setDragging(null);
          tableOps.setRowFractions(slideId, shape.id, fr);
        }}
      >
        <Rect x={0} y={-HANDLE_HIT / 2} width={shape.w} height={HANDLE_HIT} />
        {dragging === key && (
          <Rect x={0} y={-1} width={shape.w} height={2} fill="#1a73e8" listening={false} />
        )}
      </Group>,
    );
  }

  return (
    <Group x={shape.x} y={shape.y} rotation={shape.rotation ?? 0}>
      {handles}
    </Group>
  );
}
