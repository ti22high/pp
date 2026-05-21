import { describe, it, expect } from 'vitest';
import { createConnector } from '../../src/renderer/lib/model/factory';
import { connectorShapeSchema } from '../../src/renderer/lib/model/schema';
import { connectionPoints, resolveEndpoint, connectorPoints } from '../../src/renderer/lib/connector';

describe('connector', () => {
  it('factory produces a valid connector', () => {
    const c = createConnector(0, 0, 200, 100, 'elbow');
    expect(c.type).toBe('connector');
    expect(connectorShapeSchema.safeParse(c).success).toBe(true);
  });

  it('connectionPoints gives 9 points', () => {
    const p = connectionPoints({ x: 0, y: 0, w: 100, h: 50 });
    expect(p.c).toEqual({ x: 50, y: 25 });
    expect(p.br).toEqual({ x: 100, y: 50 });
    expect(Object.keys(p)).toHaveLength(9);
  });

  it('resolveEndpoint follows a bound shape anchor', () => {
    const shapes = [{ id: 's1', type: 'rect', x: 10, y: 20, w: 100, h: 40 }] as never;
    const pt = resolveEndpoint({ x: 0, y: 0, shapeId: 's1', anchor: 'c' }, shapes);
    expect(pt).toEqual({ x: 60, y: 40 });
  });

  it('elbow route has orthogonal mid segments', () => {
    const pts = connectorPoints('elbow', { x: 0, y: 0 }, { x: 100, y: 40 });
    expect(pts).toEqual([0, 0, 50, 0, 50, 40, 100, 40]);
  });
});
