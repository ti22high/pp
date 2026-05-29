import { describe, it, expect } from 'vitest';
import { parseXfrm, parseFill, parseStroke } from '../../../src/renderer/lib/pptx/parser/spPr';
import type { PptxTheme } from '../../../src/renderer/lib/pptx/parser/theme';

const theme: PptxTheme = {
  colors: new Map([
    ['accent1', '5b9bd5'],
    ['tx1', '000000'],
  ]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

describe('parseXfrm', () => {
  it('off + ext → x/y/w/h в пикселях', () => {
    const xfrm = parseXfrm({
      'a:xfrm': {
        'a:off': { '@_x': '914400', '@_y': '457200' },
        'a:ext': { '@_cx': '1828800', '@_cy': '914400' },
      },
    });
    expect(xfrm.x).toBe(96);
    expect(xfrm.y).toBe(48);
    expect(xfrm.w).toBe(192);
    expect(xfrm.h).toBe(96);
    expect(xfrm.rotation).toBe(0);
  });
  it('rot=5400000 → 90°, flipH=1', () => {
    const xfrm = parseXfrm({
      'a:xfrm': {
        '@_rot': '5400000',
        '@_flipH': '1',
        'a:off': { '@_x': '0', '@_y': '0' },
        'a:ext': { '@_cx': '914400', '@_cy': '914400' },
      },
    });
    expect(xfrm.rotation).toBe(90);
    expect(xfrm.flipH).toBe(true);
    expect(xfrm.flipV).toBe(false);
  });
  it('пустой spPr → нули', () => {
    const xfrm = parseXfrm(undefined);
    expect(xfrm).toEqual({ x: 0, y: 0, w: 0, h: 0, rotation: 0, flipH: false, flipV: false });
  });
});

describe('parseFill', () => {
  it('srgbClr → solid #hex', () => {
    const f = parseFill({ 'a:solidFill': { 'a:srgbClr': { '@_val': 'FF0000' } } }, theme);
    expect(f.kind).toBe('solid');
    expect(f.color).toBe('#ff0000');
  });
  it('schemeClr accent1 → resolved через тему', () => {
    const f = parseFill({ 'a:solidFill': { 'a:schemeClr': { '@_val': 'accent1' } } }, theme);
    expect(f.color).toBe('#5b9bd5');
  });
  it('noFill → none', () => {
    expect(parseFill({ 'a:noFill': {} }, theme).kind).toBe('none');
  });
  it('alpha → opacity 0..1', () => {
    const f = parseFill(
      { 'a:solidFill': { 'a:srgbClr': { '@_val': 'ABCDEF', 'a:alpha': { '@_val': '50000' } } } },
      theme,
    );
    expect(f.opacity).toBeCloseTo(0.5, 2);
  });
});

describe('parseStroke', () => {
  it('w + dash', () => {
    const s = parseStroke(
      {
        'a:ln': {
          '@_w': '19050', // 2 px
          'a:solidFill': { 'a:srgbClr': { '@_val': '000000' } },
          'a:prstDash': { '@_val': 'dash' },
        },
      },
      theme,
    );
    expect(s?.color).toBe('#000000');
    expect(s?.width).toBe(2);
    expect(s?.dash).toBe('dashed');
  });
  it('без ln → undefined', () => {
    expect(parseStroke({}, theme)).toBeUndefined();
  });
  it('ln с noFill → undefined (без обводки)', () => {
    expect(parseStroke({ 'a:ln': { 'a:noFill': {} } }, theme)).toBeUndefined();
  });
});
