import { describe, it, expect } from 'vitest';
import { parseSp, type RawSp } from '../../../src/renderer/lib/pptx/parser/sp';
import type { PptxTheme } from '../../../src/renderer/lib/pptx/parser/theme';

const theme: PptxTheme = {
  colors: new Map([['accent1', '5b9bd5']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

const xfrmBasic = {
  'a:off': { '@_x': '914400', '@_y': '914400' },
  'a:ext': { '@_cx': '1828800', '@_cy': '914400' },
};

describe('parseSp', () => {
  it('prstGeom=rect + solidFill + ln → rectShape', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:prstGeom': { '@_prst': 'rect' },
        'a:solidFill': { 'a:srgbClr': { '@_val': 'FF0000' } },
        'a:ln': {
          '@_w': '12700',
          'a:solidFill': { 'a:srgbClr': { '@_val': '000000' } },
          'a:prstDash': { '@_val': 'solid' },
        },
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape).not.toBeNull();
    expect(shape!.type).toBe('rect');
    expect(shape!.x).toBe(96);
    expect(shape!.w).toBe(192);
    expect(shape!.fill).toEqual({ kind: 'solid', color: '#ff0000' });
    expect(shape!.stroke?.color).toBe('#000000');
  });

  it('prstGeom=ellipse → ellipseShape', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:prstGeom': { '@_prst': 'ellipse' },
        'a:solidFill': { 'a:srgbClr': { '@_val': '00FF00' } },
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.type).toBe('ellipse');
  });

  it('незнакомый prstGeom → rectShape (fallback)', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:prstGeom': { '@_prst': 'star7' },
        'a:solidFill': { 'a:srgbClr': { '@_val': 'ABCDEF' } },
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.type).toBe('rect');
  });

  it('placeholder с текстом без визуала → textShape с tiptapDoc', () => {
    const sp: RawSp = {
      'p:nvSpPr': { 'p:nvPr': { 'p:ph': { '@_type': 'title' } } },
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:noFill': {},
      },
      'p:txBody': {
        'a:p': [{ 'a:r': [{ 'a:t': 'Заголовок' }] }],
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.type).toBe('text');
  });

  it('текст в фигуре → shape.text заполнен', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:prstGeom': { '@_prst': 'rect' },
        'a:solidFill': { 'a:srgbClr': { '@_val': 'FFFFFF' } },
      },
      'p:txBody': {
        'a:p': [{ 'a:r': [{ 'a:t': 'Текст' }] }],
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.type).toBe('rect');
    expect(shape?.text).toBeDefined();
  });

  it('rot=5400000 + flipH → rotation=90, flipH=true', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': { ...xfrmBasic, '@_rot': '5400000', '@_flipH': '1' },
        'a:prstGeom': { '@_prst': 'rect' },
        'a:solidFill': { 'a:srgbClr': { '@_val': '000000' } },
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.rotation).toBe(90);
    expect(shape?.flipH).toBe(true);
  });

  it('фигура с нулевыми размерами → null', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': {
          'a:off': { '@_x': '0', '@_y': '0' },
          'a:ext': { '@_cx': '0', '@_cy': '0' },
        },
        'a:prstGeom': { '@_prst': 'rect' },
      },
    };
    expect(parseSp(sp, theme)).toBeNull();
  });

  it('dash=dash → массив [8,4]', () => {
    const sp: RawSp = {
      'p:spPr': {
        'a:xfrm': xfrmBasic,
        'a:prstGeom': { '@_prst': 'rect' },
        'a:solidFill': { 'a:srgbClr': { '@_val': 'FFFFFF' } },
        'a:ln': {
          '@_w': '12700',
          'a:solidFill': { 'a:srgbClr': { '@_val': '000000' } },
          'a:prstDash': { '@_val': 'dash' },
        },
      },
    };
    const shape = parseSp(sp, theme);
    expect(shape?.stroke?.dash).toEqual([8, 4]);
  });
});
