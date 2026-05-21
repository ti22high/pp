import { describe, it, expect } from 'vitest';
import { pointsToSmoothPath } from '../../src/renderer/lib/freeform';

describe('pointsToSmoothPath', () => {
  it('two points → line', () => {
    expect(pointsToSmoothPath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M 0 0 L 10 5');
  });
  it('many points → smooth quadratics', () => {
    const d = pointsToSmoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 }]);
    expect(d.startsWith('M 0 0 Q')).toBe(true);
    expect(d.includes('L 30 10')).toBe(true);
  });
  it('empty → empty', () => {
    expect(pointsToSmoothPath([])).toBe('');
  });
});

import { arcPath } from '../../src/renderer/lib/freeform';
describe('arcPath', () => {
  it('builds a quadratic arc between two points', () => {
    const d = arcPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5);
    expect(d.startsWith('M 0 0 Q')).toBe(true);
    expect(d.endsWith('100 0')).toBe(true);
  });
});
