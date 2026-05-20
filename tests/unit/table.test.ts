import { describe, it, expect } from 'vitest';
import { createTable } from '../../src/renderer/lib/model/factory';
import {
  insertRow,
  insertCol,
  deleteRow,
  deleteCol,
  mergeRange,
  splitCell,
  distributeRows,
  distributeCols,
  cellRects,
} from '../../src/renderer/lib/table';
import { tableShapeSchema } from '../../src/renderer/lib/model/schema';

function make(rows: number, cols: number) {
  return createTable(0, 0, 1000, 600, rows, cols);
}

describe('table operations', () => {
  it('createTable builds a valid rows×cols grid', () => {
    const t = make(3, 4);
    expect(tableShapeSchema.safeParse(t).success).toBe(true);
    expect(t.cells).toHaveLength(3);
    expect(t.cells[0]).toHaveLength(4);
    expect(t.colFractions).toHaveLength(4);
    expect(t.rowFractions).toHaveLength(3);
  });

  it('insertRow/insertCol grow the grid and normalize fractions', () => {
    const t = make(2, 2);
    insertRow(t, 1);
    expect(t.rows).toBe(3);
    expect(t.cells).toHaveLength(3);
    expect(t.rowFractions.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    insertCol(t, 0);
    expect(t.cols).toBe(3);
    expect(t.cells[0]).toHaveLength(3);
    expect(t.colFractions.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('deleteRow/deleteCol shrink the grid but never below 1', () => {
    const t = make(2, 2);
    deleteRow(t, 0);
    expect(t.rows).toBe(1);
    deleteRow(t, 0);
    expect(t.rows).toBe(1); // не уходим ниже 1
    deleteCol(t, 0);
    expect(t.cols).toBe(1);
    deleteCol(t, 0);
    expect(t.cols).toBe(1);
  });

  it('mergeRange sets span on anchor and marks others merged', () => {
    const t = make(3, 3);
    t.cells[0][0].text = 'A';
    t.cells[0][1].text = 'B';
    mergeRange(t, 0, 0, 1, 1);
    expect(t.cells[0][0].colSpan).toBe(2);
    expect(t.cells[0][0].rowSpan).toBe(2);
    expect(t.cells[0][0].text).toBe('A B');
    expect(t.cells[0][1].merged).toBe(true);
    expect(t.cells[1][1].merged).toBe(true);
    // rects не включают накрытые ячейки: 9 - 3 накрытых = 6 видимых анкоров.
    expect(cellRects(t)).toHaveLength(6);
  });

  it('merges three rows in one column fully (incl. bottom)', () => {
    const t = make(4, 2);
    mergeRange(t, 0, 0, 2, 0); // строки 0,1,2 в колонке 0
    expect(t.cells[0][0].rowSpan).toBe(3);
    expect(t.cells[1][0].merged).toBe(true);
    expect(t.cells[2][0].merged).toBe(true);
    expect(t.cells[3][0].merged).toBeUndefined(); // 4-я строка вне диапазона
  });

  it('splitCell undoes a merge', () => {
    const t = make(2, 2);
    mergeRange(t, 0, 0, 1, 1);
    splitCell(t, 0, 0);
    expect(t.cells[0][0].colSpan).toBeUndefined();
    expect(t.cells[0][1].merged).toBeUndefined();
    expect(cellRects(t)).toHaveLength(4);
  });

  it('inserting a row below a vertical merge keeps it intact', () => {
    const t = make(3, 2);
    mergeRange(t, 0, 0, 1, 0); // объединены строки 0-1 в колонке 0
    expect(t.cells[0][0].rowSpan).toBe(2);
    insertRow(t, 2); // вставка ПОД объединением (rEnd+1)
    expect(t.cells[0][0].rowSpan).toBe(2); // объединение сохранилось
    expect(t.rows).toBe(4);
  });

  it('inserting a row through a vertical merge splits it', () => {
    const t = make(3, 2);
    mergeRange(t, 0, 0, 2, 0); // вертикальное объединение всей колонки 0
    expect(t.cells[0][0].rowSpan).toBe(3);
    insertRow(t, 1); // вставка внутрь объединения
    expect(t.cells[0][0].rowSpan).toBeUndefined(); // расщеплено
    expect(t.rows).toBe(4);
  });

  it('distribute resets fractions to equal', () => {
    const t = make(2, 4);
    t.colFractions = [0.7, 0.1, 0.1, 0.1];
    distributeCols(t);
    expect(t.colFractions.every((f) => Math.abs(f - 0.25) < 1e-9)).toBe(true);
    distributeRows(t);
    expect(t.rowFractions.every((f) => Math.abs(f - 0.5) < 1e-9)).toBe(true);
  });
});
