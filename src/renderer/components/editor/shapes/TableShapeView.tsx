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
// выбирает её (Shift — расширяет диапазон); двойной клик открывает
// редактирование текста. Ресайз границ — отдельным оверлеем на верхнем слое
// (TableResizeOverlay), вне draggable-группы, иначе Konva дёргает и таблицу.
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

  // Выбор ячейки — на mousedown (не click): у таблицы Group draggable, и любой
  // микро-сдвиг гасит click, из-за чего выбор не обновлялся. Shift расширяет
  // диапазон; в этом случае гасим всплытие, чтобы Stage не переключил
  // выделение самой фигуры (его shift-логика мульти-выделения).
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const p = localPoint(e);
    if (!p) return;
    const hit = cellAtPoint(shape, p.x, p.y);
    if (!hit) return;
    // Учитываем объединение: выбор покрывает весь span анкор-ячейки, иначе
    // «вставить строку ниже» попадёт ВНУТРЬ объединения и расщепит его.
    const cell = shape.cells[hit.row]?.[hit.col];
    const rEnd = hit.row + (cell?.rowSpan ?? 1) - 1;
    const cEnd = hit.col + (cell?.colSpan ?? 1) - 1;
    if (e.evt.shiftKey && selection) {
      e.cancelBubble = true;
      setTableSelection({ shapeId: shape.id, r0: selection.r0, c0: selection.c0, r1: rEnd, c1: cEnd });
    } else {
      setTableSelection({ shapeId: shape.id, r0: hit.row, c0: hit.col, r1: rEnd, c1: cEnd });
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
      <Group onMouseDown={handleMouseDown} onDblClick={handleDblClick} onDblTap={handleDblClick}>
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
          const cell = shape.cells[r.row]?.[r.col];
          const text = cell?.text ?? '';
          const pad = cell?.padding ?? CELL_PADDING;
          const borderW = cell?.borderWidth ?? 1;
          // Заливка ячейки: выбор подсвечиваем поверх собственного фона.
          const cellFill = inSel ? 'rgba(26, 115, 232, 0.18)' : cell?.fill;
          // Границу рисуем ВНУТРЬ ячейки (внешний край на границе ячейки),
          // чтобы толстая рамка не «вылезала» в соседнюю ячейку. Поэтому
          // прямоугольник границы сдвинут на borderW/2 внутрь, а заливка —
          // отдельным прямоугольником на всю ячейку.
          const inset = borderW / 2;
          return (
            <Group key={`${r.row}-${r.col}`}>
              {cellFill && (
                <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill={cellFill} />
              )}
              {borderW > 0 && (
                <Rect
                  x={r.x + inset}
                  y={r.y + inset}
                  width={Math.max(0, r.w - borderW)}
                  height={Math.max(0, r.h - borderW)}
                  stroke={cell?.borderColor ?? BORDER_COLOR}
                  strokeWidth={borderW}
                  listening={false}
                />
              )}
              {!isEditing && text !== '' && (
                <Text
                  x={r.x + pad}
                  y={r.y + pad}
                  width={Math.max(1, r.w - pad * 2)}
                  height={Math.max(1, r.h - pad * 2)}
                  text={text}
                  fontSize={cell?.fontSize ?? FONT_SIZE}
                  fontFamily={cell?.fontFamily ?? 'Arial, sans-serif'}
                  fontStyle={
                    `${cell?.bold ? 'bold' : ''} ${cell?.italic ? 'italic' : ''}`.trim() ||
                    'normal'
                  }
                  fill={cell?.color ?? '#202124'}
                  align={cell?.align ?? 'left'}
                  verticalAlign={cell?.valign ?? 'middle'}
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
