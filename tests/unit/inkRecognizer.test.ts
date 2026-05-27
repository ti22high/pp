import { describe, it, expect } from 'vitest';
import { recognize, type InkTemplate, type InkPoint } from '../../src/renderer/lib/inkRecognizer';

// Прямая из k точек.
function line(x0: number, y0: number, x1: number, y1: number, k = 12): InkPoint[] {
  const out: InkPoint[] = [];
  for (let i = 0; i < k; i++) {
    const t = i / (k - 1);
    out.push({ x: x0 + t * (x1 - x0), y: y0 + t * (y1 - y0) });
  }
  return out;
}

// Окружность из k точек.
function circle(cx: number, cy: number, r: number, k = 24): InkPoint[] {
  const out: InkPoint[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / (k - 1)) * 2 * Math.PI;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

const templates: InkTemplate[] = [
  { latex: '-', label: 'минус', strokes: [line(0, 0, 10, 0)] },
  { latex: '|', label: 'палочка', strokes: [line(0, 0, 0, 10)] },
  { latex: 'O', label: 'круг', strokes: [circle(5, 5, 5)] },
  { latex: '=', label: 'равно', strokes: [line(0, 0, 10, 0), line(0, 4, 10, 4)] },
];

describe('recognize ($P)', () => {
  it('горизонтальный штрих → минус', () => {
    const m = recognize([line(0.5, 0.3, 9.4, -0.2)], templates);
    expect(m[0].latex).toBe('-');
  });

  it('вертикальный штрих → палочка', () => {
    const m = recognize([line(0.2, 0.5, -0.1, 9.6)], templates);
    expect(m[0].latex).toBe('|');
  });

  it('замкнутый штрих → круг', () => {
    const m = recognize([circle(3, 3, 4)], templates);
    expect(m[0].latex).toBe('O');
  });

  it('два горизонтальных штриха → равно (многоштриховой)', () => {
    const m = recognize([line(0.2, 0.1, 9.8, -0.1), line(0, 3.1, 10, 2.9)], templates);
    expect(m[0].latex).toBe('=');
  });

  it('возвращает ранжированный список (по возрастанию score)', () => {
    const m = recognize([line(0, 0, 10, 0)], templates);
    expect(m.length).toBeGreaterThan(1);
    for (let i = 1; i < m.length; i++) expect(m[i].score).toBeGreaterThanOrEqual(m[i - 1].score);
  });

  it('пустой ввод / одна точка → нет совпадений', () => {
    expect(recognize([], templates)).toEqual([]);
    expect(recognize([[{ x: 1, y: 1 }]], templates)).toEqual([]);
  });
});
