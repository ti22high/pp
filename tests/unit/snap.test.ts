import { describe, it, expect } from 'vitest';
import { computeSnap, unionBox, type SnapBox } from '../../src/renderer/lib/snap';

// dragged X-якоря: left=100, centerH=125, right=150 (w=50).
// Боксы-цели делаем широкими (w=400), чтобы в порог попадал только один
// якорь и тест проверял именно его, без случайных совпадений center/right.
describe('computeSnap', () => {
  const dragged: SnapBox = { x: 100, y: 100, w: 50, h: 50 };

  it('snaps left edge to another shape within threshold', () => {
    const others: SnapBox[] = [{ x: 103, y: 600, w: 400, h: 20 }];
    const res = computeSnap(dragged, others, 6);
    expect(res.dx).toBe(3);
    expect(res.guides.some((g) => g.kind === 'v' && g.pos === 103)).toBe(true);
  });

  it('does not snap beyond threshold', () => {
    const others: SnapBox[] = [{ x: 300, y: 600, w: 10, h: 10 }];
    const res = computeSnap(dragged, others, 6);
    expect(res.dx).toBe(0);
    expect(res.dy).toBe(0);
    expect(res.guides).toHaveLength(0);
  });

  it('snaps center to center', () => {
    // Бокс шириной 400, центрированный на 128 → centerH=128.
    const others: SnapBox[] = [{ x: -72, y: 600, w: 400, h: 20 }];
    const res = computeSnap(dragged, others, 6);
    expect(res.dx).toBe(3); // 128 - 125
  });

  it('snaps to user guides', () => {
    const res = computeSnap(dragged, [], 6, { v: [103], h: [] });
    expect(res.dx).toBe(3);
    expect(res.guides.some((g) => g.kind === 'v' && g.pos === 103)).toBe(true);
  });

  it('picks the nearest anchor when several are in range', () => {
    const others: SnapBox[] = [
      { x: 105, y: 600, w: 400, h: 20 }, // left diff 5
      { x: 102, y: 600, w: 400, h: 20 }, // left diff 2 — ближе
    ];
    const res = computeSnap(dragged, others, 6);
    expect(res.dx).toBe(2);
  });
});

describe('unionBox', () => {
  it('returns null for empty input', () => {
    expect(unionBox([])).toBeNull();
  });

  it('computes bounding box over several shapes', () => {
    const u = unionBox([
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 50, y: 5, w: 10, h: 40 },
    ]);
    expect(u).toEqual({ x: 10, y: 5, w: 50, h: 40 });
  });
});
