import { describe, it, expect } from 'vitest';
import { chartDataFromRows } from '../../src/renderer/lib/chart';

describe('chartDataFromRows', () => {
  it('uses first row as series headers and first col as categories', () => {
    const { categories, series } = chartDataFromRows([
      ['', 'Продажи', 'Прибыль'],
      ['Янв', '120', '30'],
      ['Фев', '98', '18'],
    ]);
    expect(categories).toEqual(['Янв', 'Фев']);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ name: 'Продажи', data: [120, 98] });
    expect(series[1]).toEqual({ name: 'Прибыль', data: [30, 18] });
  });

  it('handles pure numeric grid without headers', () => {
    const { categories, series } = chartDataFromRows([
      ['10', '20'],
      ['30', '40'],
    ]);
    expect(categories).toEqual(['Кат. 1', 'Кат. 2']);
    expect(series).toHaveLength(2);
    expect(series[0].data).toEqual([10, 30]);
  });
});
