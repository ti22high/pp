// Парсер общих атрибутов фигуры (Спринт B.4): <a:xfrm>, <a:solidFill>, <a:ln>.
// Используется и в <p:sp>, и в <p:pic>, и в <p:graphicFrame>.

import { emuToPx, rotToDeg } from './emu';
import type { PptxTheme } from './theme';
import { resolveSchemeColor } from './theme';

export interface Xfrm {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export interface ParsedFill {
  // 'solid' | 'none' | 'image' (image-fill — позже, когда появятся blipFill)
  kind: 'solid' | 'none';
  color?: string; // '#rrggbb'
  opacity?: number; // 0..1
}

export interface ParsedStroke {
  color: string; // '#rrggbb'
  width: number; // px
  dash: 'solid' | 'dashed' | 'dotted';
}

// Минимальная типовая структура spPr (только то, что мы читаем сейчас).
interface RawXfrm {
  '@_rot'?: string;
  '@_flipH'?: string;
  '@_flipV'?: string;
  'a:off'?: { '@_x'?: string; '@_y'?: string };
  'a:ext'?: { '@_cx'?: string; '@_cy'?: string };
}
interface RawColor {
  '@_val'?: string;
  'a:alpha'?: { '@_val'?: string };
}
interface RawSolidFill {
  'a:srgbClr'?: RawColor;
  'a:schemeClr'?: RawColor;
}
interface RawLine {
  '@_w'?: string;
  'a:solidFill'?: RawSolidFill;
  'a:prstDash'?: { '@_val'?: string };
  'a:noFill'?: unknown;
}
export interface RawSpPr {
  'a:xfrm'?: RawXfrm;
  'a:solidFill'?: RawSolidFill;
  'a:noFill'?: unknown;
  'a:ln'?: RawLine;
}

// Парсит <a:xfrm> в координаты (px). Если xfrm отсутствует — все нули; для
// плейсхолдеров это «наследуется от мастер-слайда» (мы пока не наследуем,
// возьмутся дефолты). flipH/V — атрибуты '1' / отсутствует.
export function parseXfrm(spPr: RawSpPr | undefined): Xfrm {
  const xfrm = spPr?.['a:xfrm'];
  if (!xfrm) return { x: 0, y: 0, w: 0, h: 0, rotation: 0, flipH: false, flipV: false };
  return {
    x: emuToPx(xfrm['a:off']?.['@_x']),
    y: emuToPx(xfrm['a:off']?.['@_y']),
    w: emuToPx(xfrm['a:ext']?.['@_cx']),
    h: emuToPx(xfrm['a:ext']?.['@_cy']),
    rotation: rotToDeg(xfrm['@_rot']),
    flipH: xfrm['@_flipH'] === '1',
    flipV: xfrm['@_flipV'] === '1',
  };
}

// Извлекает hex (без '#') из solidFill: srgbClr → val; schemeClr → resolve через theme.
function extractFillHex(fill: RawSolidFill | undefined, theme: PptxTheme): string | null {
  if (!fill) return null;
  const srgb = fill['a:srgbClr']?.['@_val'];
  if (srgb) return srgb.toLowerCase();
  const scheme = fill['a:schemeClr']?.['@_val'];
  if (scheme) return resolveSchemeColor(theme, scheme);
  return null;
}

function extractAlpha(fill: RawSolidFill | undefined): number | undefined {
  // alpha в OOXML — в стотысячных: <a:alpha val="50000"/> = 50%.
  const a = fill?.['a:srgbClr']?.['a:alpha']?.['@_val'] ?? fill?.['a:schemeClr']?.['a:alpha']?.['@_val'];
  if (!a) return undefined;
  const n = parseInt(a, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(1, n / 100000));
}

export function parseFill(spPr: RawSpPr | undefined, theme: PptxTheme): ParsedFill {
  if (!spPr) return { kind: 'none' };
  if (spPr['a:noFill']) return { kind: 'none' };
  const fill = spPr['a:solidFill'];
  if (!fill) return { kind: 'none' };
  const hex = extractFillHex(fill, theme);
  if (!hex) return { kind: 'none' };
  return {
    kind: 'solid',
    color: `#${hex}`,
    opacity: extractAlpha(fill),
  };
}

// Маппинг prstDash из OOXML в наши три варианта. Любое неизвестное → solid.
function mapDash(val: string | undefined): ParsedStroke['dash'] {
  if (val === 'dash' || val === 'lgDash' || val === 'sysDash' || val === 'dashDot') return 'dashed';
  if (val === 'dot' || val === 'sysDot') return 'dotted';
  return 'solid';
}

export function parseStroke(spPr: RawSpPr | undefined, theme: PptxTheme): ParsedStroke | undefined {
  const ln = spPr?.['a:ln'];
  if (!ln) return undefined;
  if (ln['a:noFill']) return undefined;

  const fill = ln['a:solidFill'];
  const hex = extractFillHex(fill, theme);
  if (!hex) return undefined;

  const w = ln['@_w'] ? emuToPx(ln['@_w']) : 1;
  const dash = mapDash(ln['a:prstDash']?.['@_val']);
  return { color: `#${hex}`, width: w, dash };
}
