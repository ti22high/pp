import { describe, it, expect } from 'vitest';
import { recognize, type InkPoint } from '../../src/renderer/lib/inkRecognizer';
import { INK_TEMPLATES } from '../../src/renderer/lib/inkTemplates';

// Лёгкое дрожание точек — имитация «не идеально по эталону».
function jitter(strokes: InkPoint[][], d = 1.5): InkPoint[][] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff - 0.5) * 2 * d;
  };
  return strokes.map((s) => s.map((p) => ({ x: p.x + rnd(), y: p.y + rnd() })));
}

describe('INK_TEMPLATES', () => {
  it('каталог непустой, у всех есть label/latex/штрихи', () => {
    expect(INK_TEMPLATES.length).toBeGreaterThanOrEqual(30);
    for (const t of INK_TEMPLATES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.latex.length).toBeGreaterThan(0);
      expect(t.strokes.length).toBeGreaterThan(0);
    }
  });

  it('самосогласованность: каждый шаблон по своим штрихам — в топ-3', () => {
    for (const t of INK_TEMPLATES) {
      const top = recognize(t.strokes, INK_TEMPLATES, 3).map((m) => m.latex);
      expect(top, `шаблон ${t.label}`).toContain(t.latex);
      // По точному совпадению — обычно top-1.
      expect(top[0], `шаблон ${t.label} top-1`).toBe(t.latex);
    }
  });

  it('устойчивость к дрожанию: символ распознаётся в топ-3', () => {
    for (const t of INK_TEMPLATES) {
      const top = recognize(jitter(t.strokes), INK_TEMPLATES, 3).map((m) => m.latex);
      expect(top, `шаблон ${t.label} (jitter)`).toContain(t.latex);
    }
  });
});
