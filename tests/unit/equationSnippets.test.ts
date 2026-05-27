import { describe, it, expect } from 'vitest';
import { SNIPPET_GROUPS } from '../../src/renderer/lib/equationSnippets';

describe('SNIPPET_GROUPS', () => {
  it('группы и кнопки не пустые, есть структуры/греческие', () => {
    expect(SNIPPET_GROUPS.length).toBeGreaterThanOrEqual(3);
    const titles = SNIPPET_GROUPS.map((g) => g.title);
    expect(titles).toContain('Структуры');
    expect(titles).toContain('Греческие');
    for (const g of SNIPPET_GROUPS) expect(g.items.length).toBeGreaterThan(0);
  });

  it('у каждого пункта есть label и insert', () => {
    for (const g of SNIPPET_GROUPS) {
      for (const it of g.items) {
        expect(it.label.length).toBeGreaterThan(0);
        expect(it.insert.length).toBeGreaterThan(0);
      }
    }
  });
});
