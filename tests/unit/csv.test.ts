import { describe, it, expect } from 'vitest';
import { parseCsv, parseHtmlTable } from '../../src/renderer/lib/csvImport';

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
});
