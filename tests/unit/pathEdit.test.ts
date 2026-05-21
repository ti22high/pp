import { describe, it, expect } from 'vitest';
import { parsePath, serializePath, pathHandles } from '../../src/renderer/lib/pathEdit';

describe('pathEdit', () => {
  it('parses M/L/Q and round-trips', () => {
    const segs = parsePath('M 0 0 Q 10 20 30 0 L 40 40');
    expect(segs).toHaveLength(3);
    expect(segs[1].cmd).toBe('Q');
    expect(segs[1].control).toEqual({ x: 10, y: 20 });
    expect(serializePath(segs)).toBe('M 0 0 Q 10 20 30 0 L 40 40');
  });

  it('expands T into explicit Q (reflected control)', () => {
    const segs = parsePath('M 0 0 Q 10 10 20 0 T 40 0');
    expect(segs[2].cmd).toBe('Q');
    // отражение (10,10) относительно (20,0) → (30,-10)
    expect(segs[2].control).toEqual({ x: 30, y: -10 });
  });

  it('handles = control + anchor per Q', () => {
    const segs = parsePath('M 0 0 Q 10 20 30 0');
    const h = pathHandles(segs);
    expect(h).toHaveLength(3); // M anchor + Q control + Q anchor
  });
});
