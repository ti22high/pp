import { describe, it, expect } from 'vitest';
import { parseCsv } from '../../src/renderer/lib/csvImport';

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

  it('pads short rows to the widest column count', () => {
    const rows = parseCsv('a,b,c\n1');
    expect(rows[0]).toHaveLength(3);
    expect(rows[1]).toHaveLength(3);
    expect(rows[1]).toEqual(['1', '', '']);
  });
});
