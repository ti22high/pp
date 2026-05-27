import { describe, it, expect } from 'vitest';
import { applySnippet, SNIPPET_GROUPS, SNIPPET_CARET } from '../../src/renderer/lib/equationSnippets';

describe('applySnippet', () => {
  it('вставляет сниппет в позицию курсора, каретка — на маркере', () => {
    const res = applySnippet('ab', 1, 1, `\\frac{${SNIPPET_CARET}}{}`);
    expect(res.value).toBe('a\\frac{}{}b');
    expect(res.caret).toBe(1 + '\\frac{'.length); // внутри первых скобок
    expect(res.value.includes(SNIPPET_CARET)).toBe(false);
  });

  it('без маркера — каретка в конце вставки', () => {
    const res = applySnippet('x', 1, 1, '\\pi ');
    expect(res.value).toBe('x\\pi ');
    expect(res.caret).toBe('x\\pi '.length);
  });

  it('заменяет выделение', () => {
    const res = applySnippet('abc', 1, 2, '\\alpha');
    expect(res.value).toBe('a\\alphac');
  });
});

describe('SNIPPET_GROUPS', () => {
  it('группы и кнопки не пустые, есть структуры/греческие', () => {
    expect(SNIPPET_GROUPS.length).toBeGreaterThanOrEqual(3);
    const titles = SNIPPET_GROUPS.map((g) => g.title);
    expect(titles).toContain('Структуры');
    expect(titles).toContain('Греческие');
    for (const g of SNIPPET_GROUPS) expect(g.items.length).toBeGreaterThan(0);
  });
});
