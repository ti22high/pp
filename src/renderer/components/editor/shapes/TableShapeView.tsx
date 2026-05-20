import { memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TableShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { cellRects, cellAtPoint } from '@renderer/lib/table';
import { ShapeNode } from './ShapeNode';

interface TableShapeViewProps {
  shape: TableShape;
  slideId: string;
}

const CELL_PADDING = 8;
const BORDER_COLOR = '#9aa0a6';
const FONT_SIZE = 18;

// Рендер таблицы: Konva.Group из прямоугольников-ячеек (Rect с обводкой даёт
// сетку) и текста, с учётом объединений (span). Одиночный клик по ячейке
// выбирает её (Shift — расширяет диапазон) для операций строк/столбцов и
// объединения; двойной клик открывает редактирование текста.
export const TableShapeView = memo(function TableShapeViewBase({ shape, slideId }: TableShapeViewProps) {
  const setEditingTableCell = useUiStore((s) => s.setEditingTableCell);
  const setTableSelection = useUiStore((s) => s.setTableSelection);
  const editing = useUiStore((s) =>
    s.editingTableCell?.shapeId === shape.id ? s.editingTableCell : null,
  );
  const selection = useUiStore((s) =>
    s.tableSelection?.shapeId === shape.id ? s.tableSelection : null,
  );
  const isShapeSelected = useSelectionStore((s) => s.selectedShapeIds.includes(shape.id));
  const rects = cellRects(shape);

  const localPoint = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
    e.currentTarget.getRelativePointerPosition();

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const p = localPoint(e);
    if (!p) return;
    const hit = cellAtPoint(shape, p.x, p.y);
    if (!hit) return;
    if (e.evt.shiftKey && selection) {
      setTableSelection({ shapeId: shape.id, r0: selection.r0, c0: selection.c0, r1: hit.row, c1: hit.col });
    } else {
      setTableSelection({ shapeId: shape.id, r0: hit.row, c0: hit.col, r1: hit.row, c1: hit.col });
    }
  };

  const handleDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const p = localPoint(e);
    if (!p) return;
    const hit = cellAtPoint(shape, p.x, p.y);
    if (hit) setEditingTableCell({ shapeId: shape.id, row: hit.row, col: hit.col });
  };

  const selRange = selection
    ? {
        rMin: Math.min(selection.r0, selection.r1),
        rMax: Math.max(selection.r0, selection.r1),
        cMin: Math.min(selection.c0, selection.c1),
        cMax: Math.max(selection.c0, selection.c1),
      }
    : null;

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
      <Group onClick={handleClick} onDblClick={handleDblClick} onDblTap={handleDblClick}>
        <Rect x={0} y={0} width={shape.w} height={shape.h} fill="#ffffff" />
        {rects.map((r) => {
          const isEditing = editing && editing.row === r.row && editing.col === r.col;
          const inSel =
            isShapeSelected &&
            selRange &&
            r.row >= selRange.rMin &&
            r.row <= selRange.rMax &&
            r.col >= selRange.cMin &&
            r.col <= selRange.cMax;
          const text = shape.cells[r.row]?.[r.col]?.text ?? '';
          return (
            <Group key={`${r.row}-${r.col}`}>
              <Rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={inSel ? 'rgba(26, 115, 232, 0.18)' : undefined}
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
                  fontSize={FONT_SIZE}
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
