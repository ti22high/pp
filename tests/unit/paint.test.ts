import { describe, it, expect } from 'vitest';
import { resolveFill } from '../../src/renderer/components/editor/shapes/paint';

// Image-fill (Phase 3.19): растягивание картинки на bbox фигуры. Проверяем
// заглушку (картинка не загружена) и геометрию pattern для rect/ellipse-origin.
const img = (w: number, h: number) => ({ width: w, height: h }) as unknown as HTMLImageElement;

describe('resolveFill image', () => {
  it('без загруженной картинки — серая заглушка', () => {
    const r = resolveFill({ kind: 'image', src: 'x' }, 100, 50, undefined, undefined, null);
    expect(r.fillPriority).toBe('color');
    expect(r.fill).toBe('#e0e0e0');
    expect(r.fillPatternImage).toBeUndefined();
  });

  it('rect-origin (cx=w/2): bbox от (0,0), scale = bbox/натуральный размер', () => {
    const r = resolveFill({ kind: 'image', src: 'x' }, 100, 50, undefined, undefined, img(200, 100));
    expect(r.fillPriority).toBe('pattern');
    expect(r.fillPatternImage).toBeDefined();
    expect(r.fillPatternX).toBe(0);
    expect(r.fillPatternY).toBe(0);
    expect(r.fillPatternScaleX).toBeCloseTo(0.5);
    expect(r.fillPatternScaleY).toBeCloseTo(0.5);
    expect(r.fillPatternRepeat).toBe('no-repeat');
  });

  it('ellipse-origin (cx=cy=0): bbox смещён на -w/2,-h/2', () => {
    const r = resolveFill({ kind: 'image', src: 'x' }, 100, 50, 0, 0, img(100, 50));
    expect(r.fillPatternX).toBe(-50);
    expect(r.fillPatternY).toBe(-25);
    expect(r.fillPatternScaleX).toBeCloseTo(1);
    expect(r.fillPatternScaleY).toBeCloseTo(1);
  });
});
