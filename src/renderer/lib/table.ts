import { useDeckStore } from '@renderer/stores/deck';
import type { TableShape, TableCell } from '@renderer/lib/model/schema';

export interface CellRect {
  row: number;
  col: number;
  w: number; // ширина прямоугольника (с учётом colSpan)
  h: number; // высота (с учётом rowSpan)
  x: number;
  y: number;
}

// Кумулятивные границы колонок/строк в локальных координатах (0..w / 0..h).
// Возвращает массивы длиной cols+1 / rows+1.
export function gridLines(shape: TableShape): { colX: number[]; rowY: number[] } {
  const sumCol = shape.colFractions.reduce((a, b) => a + b, 0) || 1;
  const sumRow = shape.rowFractions.reduce((a, b) => a + b, 0) || 1;
  const colX = [0];
  for (const f of shape.colFractions) colX.push(colX[colX.length - 1] + (f / sumCol) * shape.w);
  const rowY = [0];
  for (const f of shape.rowFractions) rowY.push(rowY[rowY.length - 1] + (f / sumRow) * shape.h);
  return { colX, rowY };
}

// Прямоугольники видимых (не накрытых объединением) ячеек с учётом span-ов.
export function cellRects(shape: TableShape): CellRect[] {
  const { colX, rowY } = gridLines(shape);
  const rects: CellRect[] = [];
  for (let r = 0; r < shape.rows; r++) {
    for (let c = 0; c < shape.cols; c++) {
      const cell = shape.cells[r]?.[c];
      if (!cell || cell.merged) continue;
      const cs = cell.colSpan ?? 1;
      const rs = cell.rowSpan ?? 1;
      const x = colX[c];
      const y = rowY[r];
      rects.push({
        row: r,
        col: c,
        x,
        y,
        w: (colX[Math.min(c + cs, shape.cols)] ?? shape.w) - x,
        h: (rowY[Math.min(r + rs, shape.rows)] ?? shape.h) - y,
      });
    }
  }
  return rects;
}

// Ячейка-анкор по точке в локальных координатах фигуры (накрытые ячейки
// мапятся на свой анкор), либо null.
export function cellAtPoint(
  shape: TableShape,
  lx: number,
  ly: number,
): { row: number; col: number } | null {
  for (const r of cellRects(shape)) {
    if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) {
      return { row: r.row, col: r.col };
    }
  }
  return null;
}

// ── Операции над сеткой (мутируют draft внутри immer setState) ─────────────

function newCell(): TableCell {
  return { text: '' };
}

function normalize(arr: number[]): number[] {
  const sum = arr.reduce((a, b) => a + b, 0) || 1;
  return arr.map((v) => v / sum);
}

// Снимает объединение с анкора (r,c): очищает merged у накрытых ячеек и span-ы.
function unmergeAnchor(t: TableShape, r: number, c: number): void {
  const anchor = t.cells[r]?.[c];
  if (!anchor) return;
  const cs = anchor.colSpan ?? 1;
  const rs = anchor.rowSpan ?? 1;
  for (let rr = r; rr < r + rs && rr < t.rows; rr++) {
    for (let cc = c; cc < c + cs && cc < t.cols; cc++) {
      const cell = t.cells[rr]?.[cc];
      if (cell) cell.merged = undefined;
    }
  }
  anchor.colSpan = undefined;
  anchor.rowSpan = undefined;
}

// Расщепляет вертикальные объединения, проходящие сквозь границу строки R
// (insert) либо саму строку R (delete).
function splitVerticalAt(t: TableShape, row: number, boundary: boolean): void {
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell = t.cells[r]?.[c];
      if (!cell || cell.merged) continue;
      const rs = cell.rowSpan ?? 1;
      if (rs <= 1) continue;
      const crosses = boundary ? r < row && r + rs > row : r <= row && row < r + rs;
      if (crosses) unmergeAnchor(t, r, c);
    }
  }
}

function splitHorizontalAt(t: TableShape, col: number, boundary: boolean): void {
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell = t.cells[r]?.[c];
      if (!cell || cell.merged) continue;
      const cs = cell.colSpan ?? 1;
      if (cs <= 1) continue;
      const crosses = boundary ? c < col && c + cs > col : c <= col && col < c + cs;
      if (crosses) unmergeAnchor(t, r, c);
    }
  }
}

export function insertRow(t: TableShape, at: number): void {
  splitVerticalAt(t, at, true);
  const row = Array.from({ length: t.cols }, newCell);
  t.cells.splice(at, 0, row);
  const avg = 1 / t.rows;
  t.rowFractions.splice(at, 0, avg);
  t.rowFractions = normalize(t.rowFractions);
  t.rows += 1;
}

export function insertCol(t: TableShape, at: number): void {
  splitHorizontalAt(t, at, true);
  for (const row of t.cells) row.splice(at, 0, newCell());
  const avg = 1 / t.cols;
  t.colFractions.splice(at, 0, avg);
  t.colFractions = normalize(t.colFractions);
  t.cols += 1;
}

export function deleteRow(t: TableShape, at: number): void {
  if (t.rows <= 1) return;
  splitVerticalAt(t, at, false);
  t.cells.splice(at, 1);
  t.rowFractions.splice(at, 1);
  t.rowFractions = normalize(t.rowFractions);
  t.rows -= 1;
}

export function deleteCol(t: TableShape, at: number): void {
  if (t.cols <= 1) return;
  splitHorizontalAt(t, at, false);
  for (const row of t.cells) row.splice(at, 1);
  t.colFractions.splice(at, 1);
  t.colFractions = normalize(t.colFractions);
  t.cols -= 1;
}

// Объединяет прямоугольный диапазон ячеек. Сначала расщепляет любые
// пересекающиеся объединения, затем делает (r0,c0) анкором, остальные — merged.
export function mergeRange(t: TableShape, r0: number, c0: number, r1: number, c1: number): void {
  const rMin = Math.min(r0, r1);
  const rMax = Math.max(r0, r1);
  const cMin = Math.min(c0, c1);
  const cMax = Math.max(c0, c1);
  if (rMin === rMax && cMin === cMax) return;

  // Расщепляем объединения, выходящие за пределы диапазона.
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell = t.cells[r]?.[c];
      if (!cell || cell.merged) continue;
      const cs = cell.colSpan ?? 1;
      const rs = cell.rowSpan ?? 1;
      if ((cs > 1 || rs > 1) && r <= rMax && r + rs > rMin && c <= cMax && c + cs > cMin) {
        unmergeAnchor(t, r, c);
      }
    }
  }

  const anchor = t.cells[rMin][cMin];
  const texts: string[] = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const cell = t.cells[r][c];
      if (cell.text.trim() !== '') texts.push(cell.text);
      if (r === rMin && c === cMin) continue;
      cell.merged = true;
      cell.text = '';
      cell.colSpan = undefined;
      cell.rowSpan = undefined;
    }
  }
  anchor.colSpan = cMax - cMin + 1;
  anchor.rowSpan = rMax - rMin + 1;
  anchor.merged = undefined;
  anchor.text = texts.join(' ');
}

export function splitCell(t: TableShape, r: number, c: number): void {
  const cell = t.cells[r]?.[c];
  if (!cell || cell.merged) return;
  unmergeAnchor(t, r, c);
}

// Формат ячейки (Phase 3.10) — частичный набор полей. undefined-значение
// очищает поле (возврат к умолчанию).
export interface CellFormat {
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  valign?: 'top' | 'middle' | 'bottom';
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fontFamily?: string;
  fontSize?: number;
}

// Применяет формат ко всем ячейкам в прямоугольном диапазоне.
export function setCellFormat(
  t: TableShape,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  fmt: CellFormat,
): void {
  const rMin = Math.min(r0, r1);
  const rMax = Math.max(r0, r1);
  const cMin = Math.min(c0, c1);
  const cMax = Math.max(c0, c1);
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const cell = t.cells[r]?.[c];
      if (!cell) continue;
      if ('fill' in fmt) cell.fill = fmt.fill;
      if ('borderColor' in fmt) cell.borderColor = fmt.borderColor;
      if ('borderWidth' in fmt) cell.borderWidth = fmt.borderWidth;
      if ('padding' in fmt) cell.padding = fmt.padding;
      if ('align' in fmt) cell.align = fmt.align;
      if ('valign' in fmt) cell.valign = fmt.valign;
      if ('color' in fmt) cell.color = fmt.color;
      if ('bold' in fmt) cell.bold = fmt.bold;
      if ('italic' in fmt) cell.italic = fmt.italic;
      if ('fontFamily' in fmt) cell.fontFamily = fmt.fontFamily;
      if ('fontSize' in fmt) cell.fontSize = fmt.fontSize;
    }
  }
}

export function distributeRows(t: TableShape): void {
  t.rowFractions = t.rowFractions.map(() => 1 / t.rows);
}

export function distributeCols(t: TableShape): void {
  t.colFractions = t.colFractions.map(() => 1 / t.cols);
}

// ── Store-обёртки ──────────────────────────────────────────────────────────

function withTable(slideId: string, shapeId: string, fn: (t: TableShape) => void): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'table') return;
    fn(sh);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function setTableCellText(
  slideId: string,
  shapeId: string,
  row: number,
  col: number,
  text: string,
): void {
  withTable(slideId, shapeId, (t) => {
    const cell = t.cells[row]?.[col];
    if (cell) cell.text = text;
  });
}

export const tableOps = {
  insertRow: (slideId: string, shapeId: string, at: number) =>
    withTable(slideId, shapeId, (t) => insertRow(t, at)),
  insertCol: (slideId: string, shapeId: string, at: number) =>
    withTable(slideId, shapeId, (t) => insertCol(t, at)),
  deleteRow: (slideId: string, shapeId: string, at: number) =>
    withTable(slideId, shapeId, (t) => deleteRow(t, at)),
  deleteCol: (slideId: string, shapeId: string, at: number) =>
    withTable(slideId, shapeId, (t) => deleteCol(t, at)),
  merge: (slideId: string, shapeId: string, r0: number, c0: number, r1: number, c1: number) =>
    withTable(slideId, shapeId, (t) => mergeRange(t, r0, c0, r1, c1)),
  split: (slideId: string, shapeId: string, r: number, c: number) =>
    withTable(slideId, shapeId, (t) => splitCell(t, r, c)),
  distributeRows: (slideId: string, shapeId: string) =>
    withTable(slideId, shapeId, distributeRows),
  distributeCols: (slideId: string, shapeId: string) =>
    withTable(slideId, shapeId, distributeCols),
  setCellFormat: (
    slideId: string,
    shapeId: string,
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    fmt: CellFormat,
  ) => withTable(slideId, shapeId, (t) => setCellFormat(t, r0, c0, r1, c1, fmt)),
  setColFractions: (slideId: string, shapeId: string, fractions: number[]) =>
    withTable(slideId, shapeId, (t) => {
      t.colFractions = normalize(fractions);
    }),
  setRowFractions: (slideId: string, shapeId: string, fractions: number[]) =>
    withTable(slideId, shapeId, (t) => {
      t.rowFractions = normalize(fractions);
    }),
};
