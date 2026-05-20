import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  parseHtmlTable,
  parseHtmlTableRich,
  applyA1Range,
} from '../../src/renderer/lib/csvImport';

describe('parseCsv', () => {
  it('parses simple csv into a matrix', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCsv('name,note\n"Doe, John","hello, world"');
    expect(rows[1]).toEqual(['Doe, John', 'hello, world']);
  });

  it('strips a leading BOM from the first cell', () => {
    const rows = parseCsv('﻿a,b\n1,2');
    expect(rows[0]).toEqual(['a', 'b']);
  });

  it('auto-detects semicolon delimiter', () => {
    const rows = parseCsv('a;b;c\n1;2;3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('pads short rows to the widest column count', () => {
    const rows = parseCsv('a,b,c\n1');
    expect(rows[0]).toHaveLength(3);
    expect(rows[1]).toHaveLength(3);
    expect(rows[1]).toEqual(['1', '', '']);
  });
});

describe('parseHtmlTable (Excel/Sheets paste)', () => {
  it('parses an html table into a matrix', () => {
    const html =
      '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
    expect(parseHtmlTable(html)).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ]);
  });

  it('pads ragged html rows', () => {
    const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>';
    expect(parseHtmlTable(html)).toEqual([
      ['a', 'b'],
      ['c', ''],
    ]);
  });

  it('extracts cell background and alignment', () => {
    const html =
      '<table><tr>' +
      '<td style="background-color: rgb(255, 0, 0); text-align: center">X</td>' +
      '<td bgcolor="#00ff00" align="right" valign="top">Y</td>' +
      '</tr></table>';
    const { fmt } = parseHtmlTableRich(html);
    expect(fmt?.[0][0]).toMatchObject({ fill: '#ff0000', align: 'center' });
    expect(fmt?.[0][1]).toMatchObject({ fill: '#00ff00', align: 'right', valign: 'top' });
  });

  it('extracts text color, bold, italic, font from cells', () => {
    const html =
      '<table><tr>' +
      '<td style="color: rgb(0,0,255); font-weight: bold; font-family: Calibri, sans-serif; font-size: 12pt">A</td>' +
      '<td><i>B</i></td>' +
      '<td><b>C</b></td>' +
      '</tr></table>';
    const { fmt } = parseHtmlTableRich(html);
    expect(fmt?.[0][0]).toMatchObject({ color: '#0000ff', bold: true, fontFamily: 'Calibri', fontSize: 16 });
    expect(fmt?.[0][1]).toMatchObject({ italic: true });
    expect(fmt?.[0][2]).toMatchObject({ bold: true });
  });
});

describe('applyA1Range', () => {
  const grid = [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
    ['x', 'y', 'z'],
  ];
  it('slices a sub-range', () => {
    expect(applyA1Range(grid, 'A1:B2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('returns full grid for empty/invalid range', () => {
    expect(applyA1Range(grid, '')).toBe(grid);
    expect(applyA1Range(grid, 'nonsense')).toBe(grid);
  });
});
