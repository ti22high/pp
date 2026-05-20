import { useDeckStore } from '@renderer/stores/deck';
import type { TableShape } from '@renderer/lib/model/schema';

export interface CellRect {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Прямоугольники всех ячеек в локальных координатах фигуры (0..w, 0..h).
// Ширины/высоты берём из долей; нормализуем на случай, если сумма ≠ 1.
export function cellRects(shape: TableShape): CellRect[] {
  const sumCol = shape.colFractions.reduce((a, b) => a + b, 0) || 1;
  const sumRow = shape.rowFractions.reduce((a, b) => a + b, 0) || 1;
  const colW = shape.colFractions.map((f) => (f / sumCol) * shape.w);
  const rowH = shape.rowFractions.map((f) => (f / sumRow) * shape.h);

  const colX: number[] = [];
  let accX = 0;
  for (const w of colW) {
    colX.push(accX);
    accX += w;
  }
  const rowY: number[] = [];
  let accY = 0;
  for (const h of rowH) {
    rowY.push(accY);
    accY += h;
  }

  const rects: CellRect[] = [];
  for (let r = 0; r < shape.rows; r++) {
    for (let c = 0; c < shape.cols; c++) {
      rects.push({ row: r, col: c, x: colX[c], y: rowY[r], w: colW[c], h: rowH[r] });
    }
  }
  return rects;
}

// Определяет ячейку по точке в локальных координатах фигуры, либо null.
export function cellAtPoint(shape: TableShape, lx: number, ly: number): { row: number; col: number } | null {
  for (const r of cellRects(shape)) {
    if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) {
      return { row: r.row, col: r.col };
    }
  }
  return null;
}

// Пишет текст в ячейку таблицы.
export function setTableCellText(slideId: string, shapeId: string, row: number, col: number, text: string): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'table') return;
    const cell = sh.cells[row]?.[col];
    if (!cell) return;
    cell.text = text;
    state.deck.modifiedAt = new Date().toISOString();
  });
}
