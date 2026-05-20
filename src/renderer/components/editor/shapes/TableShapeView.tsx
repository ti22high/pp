import { memo, type ReactNode } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TableShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { cellRects, cellAtPoint, gridLines, tableOps } from '@renderer/lib/table';
import { ShapeNode } from './ShapeNode';

// Минимальный размер строки/колонки при ресайзе (slide-px).
const MIN_CELL = 24;
// Толщина невидимой зоны захвата границы.
const HANDLE_HIT = 8;

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

  // Выбор ячейки — на mousedown (не click): у таблицы Group draggable, и любой
  // микро-сдвиг гасит click, из-за чего выбор не обновлялся. Shift расширяет
  // диапазон; в этом случае гасим всплытие, чтобы Stage не переключил
  // выделение самой фигуры (его shift-логика мульти-выделения).
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const p = localPoint(e);
    if (!p) return;
    const hit = cellAtPoint(shape, p.x, p.y);
    if (!hit) return;
    if (e.evt.shiftKey && selection) {
      e.cancelBubble = true;
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
        {isShapeSelected && <ResizeHandles shape={shape} slideId={slideId} />}
      </Group>
    </ShapeNode>
  );
});

// Невидимые перетаскиваемые границы для ресайза колонок/строк. Тянем границу —
// перераспределяем доли двух соседних колонок/строк (их сумма неизменна).
function ResizeHandles({ shape, slideId }: { shape: TableShape; slideId: string }) {
  const { colX, rowY } = gridLines(shape);
  const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, cur: string) => {
    const c = e.target.getStage()?.container();
    if (c) c.style.cursor = cur;
  };

  const handles: ReactNode[] = [];
  // Вертикальные границы между колонками i-1 и i.
  for (let i = 1; i < shape.cols; i++) {
    handles.push(
      <Rect
        key={`v${i}`}
        x={colX[i] - HANDLE_HIT / 2}
        y={0}
        width={HANDLE_HIT}
        height={shape.h}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onMouseEnter={(e) => setCursor(e, 'col-resize')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragMove={(e) => {
          const node = e.target;
          node.y(0);
          const g = gridLines(shape);
          const boundary = Math.max(
            g.colX[i - 1] + MIN_CELL,
            Math.min(g.colX[i + 1] - MIN_CELL, node.x() + HANDLE_HIT / 2),
          );
          node.x(boundary - HANDLE_HIT / 2);
          const fr = [...shape.colFractions];
          fr[i - 1] = (boundary - g.colX[i - 1]) / shape.w;
          fr[i] = (g.colX[i + 1] - boundary) / shape.w;
          tableOps.setColFractions(slideId, shape.id, fr);
        }}
      />,
    );
  }
  // Горизонтальные границы между строками i-1 и i.
  for (let i = 1; i < shape.rows; i++) {
    handles.push(
      <Rect
        key={`h${i}`}
        x={0}
        y={rowY[i] - HANDLE_HIT / 2}
        width={shape.w}
        height={HANDLE_HIT}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
        onMouseEnter={(e) => setCursor(e, 'row-resize')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragMove={(e) => {
          const node = e.target;
          node.x(0);
          const g = gridLines(shape);
          const boundary = Math.max(
            g.rowY[i - 1] + MIN_CELL,
            Math.min(g.rowY[i + 1] - MIN_CELL, node.y() + HANDLE_HIT / 2),
          );
          node.y(boundary - HANDLE_HIT / 2);
          const fr = [...shape.rowFractions];
          fr[i - 1] = (boundary - g.rowY[i - 1]) / shape.h;
          fr[i] = (g.rowY[i + 1] - boundary) / shape.h;
          tableOps.setRowFractions(slideId, shape.id, fr);
        }}
      />,
    );
  }
  return <>{handles}</>;
}
