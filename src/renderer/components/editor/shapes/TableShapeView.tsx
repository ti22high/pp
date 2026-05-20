import { memo, useState, type ReactNode } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TableShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { cellRects, cellAtPoint, gridLines, tableOps } from '@renderer/lib/table';
import { ShapeNode } from './ShapeNode';

// Минимальный размер строки/колонки при ресайзе (slide-px).
const MIN_CELL = 16;
// Толщина невидимой зоны захвата границы.
const HANDLE_HIT = 10;

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
  // Какая граница сейчас перетаскивается — чтобы показывать линию-превью только
  // у неё (живёт здесь, а не в ResizeHandles: hook в компоненте, не в функции).
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
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
        {isShapeSelected && (
          <ResizeHandles
            shape={shape}
            slideId={slideId}
            dragging={draggingHandle}
            setDragging={setDraggingHandle}
          />
        )}
      </Group>
    </ShapeNode>
  );
});

// Невидимые перетаскиваемые границы для ресайза колонок/строк. Во время drag
// двигаем ручку ТОЛЬКО императивно (без setState), иначе ре-рендер пересчитает
// её позицию из стора и собьёт активный Konva-drag → дрожь. Доли пишем один
// раз на dragEnd. Линия-превью видна ТОЛЬКО у перетаскиваемой ручки, иначе
// линии накладывались бы поверх объединённых ячеек и «возвращали» сетку.
function ResizeHandles({
  shape,
  slideId,
  dragging,
  setDragging,
}: {
  shape: TableShape;
  slideId: string;
  dragging: string | null;
  setDragging: (k: string | null) => void;
}) {
  const { colX, rowY } = gridLines(shape);
  const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, cur: string) => {
    const c = e.target.getStage()?.container();
    if (c) c.style.cursor = cur;
  };

  const handles: ReactNode[] = [];
  // Вертикальные границы между колонками i-1 и i.
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
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
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
  // Горизонтальные границы между строками i-1 и i.
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
        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}
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
  return <>{handles}</>;
}
