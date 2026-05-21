import { describe, it, expect } from 'vitest';
import { PRESET_CATEGORIES } from '../../src/renderer/lib/presetShapes';

const allShapes = PRESET_CATEGORIES.flatMap((c) => c.shapes);

describe('presetShapes', () => {
  it('категории и фигуры не пустые', () => {
    expect(PRESET_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    for (const cat of PRESET_CATEGORIES) {
      expect(cat.shapes.length).toBeGreaterThan(0);
    }
    expect(allShapes.length).toBeGreaterThanOrEqual(30);
  });

  it('ключи уникальны', () => {
    const keys = allShapes.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('все пути начинаются с M; заливаемые фигуры замкнуты (Z)', () => {
    for (const s of allShapes) {
      expect(s.path.startsWith('M')).toBe(true);
      // Линии — открытые пути (рисуются штрихом); остальные фигуры замкнуты.
      const isLine = s.native === 'line' || s.native === 'arrowLine';
      if (!isLine) expect(s.path.trim().endsWith('Z')).toBe(true);
    }
  });
});
