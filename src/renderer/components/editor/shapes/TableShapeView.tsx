import { memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TableShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { cellRects, cellAtPoint } from '@renderer/lib/table';
import { ShapeNode } from './ShapeNode';

interface TableShapeViewProps {
  shape: TableShape;
  slideId: string;
}

// Внутренний padding текста ячейки (slide-px).
const CELL_PADDING = 8;
const BORDER_COLOR = '#9aa0a6';
const HEADER_FONT_SIZE = 18;

// Рендер таблицы: Konva.Group из прямоугольников-ячеек (Rect с обводкой даёт
// сетку) и текста. Двойной клик по ячейке открывает её редактирование
// (editingTableCell в ui store → DOM-оверлей в Canvas).
export const TableShapeView = memo(function TableShapeViewBase({ shape, slideId }: TableShapeViewProps) {
  const setEditingTableCell = useUiStore((s) => s.setEditingTableCell);
  const editing = useUiStore((s) =>
    s.editingTableCell?.shapeId === shape.id ? s.editingTableCell : null,
  );
  const rects = cellRects(shape);

  const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const grp = e.currentTarget;
    const p = grp.getRelativePointerPosition();
    if (!p) return;
    const hit = cellAtPoint(shape, p.x, p.y);
    if (hit) setEditingTableCell({ shapeId: shape.id, row: hit.row, col: hit.col });
  };

  return (
    <ShapeNode
      id={shape.id}
      slideId={slideId}
      x={shape.x}
      y={shape.y}
      w={shape.w}
      h={shape.h}
      rotation={shape.rotation}
      opacity={shape.opacity}
      locked={shape.locked}
    >
      <Group onDblClick={handleDblClick} onDblTap={handleDblClick}>
        {/* Сплошной белый фон под всей таблицей. */}
        <Rect x={0} y={0} width={shape.w} height={shape.h} fill="#ffffff" />
        {rects.map((r) => {
          const isEditing = editing && editing.row === r.row && editing.col === r.col;
          const text = shape.cells[r.row]?.[r.col]?.text ?? '';
          return (
            <Group key={`${r.row}-${r.col}`}>
              <Rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                stroke={BORDER_COLOR}
                strokeWidth={1}
                strokeScaleEnabled={false}
              />
              {!isEditing && text !== '' && (
                <Text
                  x={r.x + CELL_PADDING}
                  y={r.y + CELL_PADDING}
                  width={Math.max(1, r.w - CELL_PADDING * 2)}
                  height={Math.max(1, r.h - CELL_PADDING * 2)}
                  text={text}
                  fontSize={HEADER_FONT_SIZE}
                  fontFamily="Arial, sans-serif"
                  fill="#202124"
                  verticalAlign="middle"
                  wrap="word"
                  listening={false}
                />
              )}
            </Group>
          );
        })}
      </Group>
    </ShapeNode>
  );
});
