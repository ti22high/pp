// Парсер <p:txBody> → TipTap JSON (Спринт B.5).
//
// Поддержано в v1: абзацы (a:p), runs (a:r), переносы (a:br), шрифт, размер,
// жирный/курсив/подчёркивание/зачёркивание, цвет, выравнивание абзаца. Списки
// (a:buChar/a:buAutoNum) пока не парсим — частая, но не критичная функция.

import { asArray } from './xml';
import { sizeToPt } from './emu';
import type { PptxTheme } from './theme';
import { resolveSchemeColor } from './theme';

interface RawColor {
  '@_val'?: string;
}
interface RawSolidFill {
  'a:srgbClr'?: RawColor;
  'a:schemeClr'?: RawColor;
}
interface RawRPr {
  '@_sz'?: string;
  '@_b'?: string;
  '@_i'?: string;
  '@_u'?: string;
  '@_strike'?: string;
  'a:solidFill'?: RawSolidFill;
  'a:latin'?: { '@_typeface'?: string };
}
interface RawRun {
  'a:rPr'?: RawRPr;
  'a:t'?: string | string[];
}
interface RawPPr {
  '@_algn'?: string;
}
interface RawPara {
  'a:pPr'?: RawPPr;
  'a:r'?: RawRun[];
  'a:br'?: unknown[];
}
export interface RawTxBody {
  'a:p'?: RawPara[];
}

interface TipTapMark {
  type: string;
  attrs?: Record<string, string | number | undefined>;
}
interface TipTapNode {
  type: string;
  attrs?: Record<string, string | undefined>;
  marks?: TipTapMark[];
  text?: string;
  content?: TipTapNode[];
}
export interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

// OOXML algn → TipTap textAlign attr.
function mapAlign(algn: string | undefined): string | undefined {
  switch (algn) {
    case 'l':
      return 'left';
    case 'ctr':
      return 'center';
    case 'r':
      return 'right';
    case 'just':
      return 'justify';
    default:
      return undefined;
  }
}

// Извлекает hex (без '#') из solidFill (с резолвом темы).
function extractRunColor(fill: RawSolidFill | undefined, theme: PptxTheme): string | null {
  if (!fill) return null;
  const srgb = fill['a:srgbClr']?.['@_val'];
  if (srgb) return srgb.toLowerCase();
  const scheme = fill['a:schemeClr']?.['@_val'];
  if (scheme) return resolveSchemeColor(theme, scheme);
  return null;
}

// Строит массив TipTap marks из rPr. Все стилистические свойства run-а
// (font/size/color) сваливаются в один mark `textStyle` (TipTap позволяет
// только один mark одного типа на узле).
function rprToMarks(rPr: RawRPr | undefined, theme: PptxTheme): TipTapMark[] {
  if (!rPr) return [];
  const marks: TipTapMark[] = [];
  if (rPr['@_b'] === '1') marks.push({ type: 'bold' });
  if (rPr['@_i'] === '1') marks.push({ type: 'italic' });
  if (rPr['@_u'] && rPr['@_u'] !== 'none') marks.push({ type: 'underline' });
  if (rPr['@_strike'] && rPr['@_strike'] !== 'noStrike') marks.push({ type: 'strike' });

  const style: Record<string, string | number> = {};
  const font = rPr['a:latin']?.['@_typeface'];
  if (font) style.fontFamily = font;
  if (rPr['@_sz']) style.fontSize = `${sizeToPt(rPr['@_sz'])}pt`;
  const color = extractRunColor(rPr['a:solidFill'], theme);
  if (color) style.color = `#${color}`;
  if (Object.keys(style).length > 0) marks.push({ type: 'textStyle', attrs: style });

  return marks;
}

// Превращает один <a:r> в один или несколько TipTap text-узлов.
// Если <a:t> массив (внутри run несколько текстовых сегментов с одинаковым
// форматированием — редкость, но возможно), создаём узел на каждый сегмент.
function runToNodes(run: RawRun, theme: PptxTheme): TipTapNode[] {
  const text = run['a:t'];
  const marks = rprToMarks(run['a:rPr'], theme);
  const segments = Array.isArray(text) ? text : text === undefined ? [] : [text];
  return segments
    .filter((s) => typeof s === 'string' && s.length > 0)
    .map((s) => ({ type: 'text', text: s, marks: marks.length > 0 ? marks : undefined }));
}

// Превращает <p:txBody> в TipTap doc. Пустой txBody → пустой doc с одним
// пустым параграфом (TipTap ожидает хотя бы один параграф).
export function parseTxBody(txBody: RawTxBody | undefined, theme: PptxTheme): TipTapDoc {
  const paragraphs = asArray<RawPara>(txBody?.['a:p']);
  if (paragraphs.length === 0) return { type: 'doc', content: [{ type: 'paragraph' }] };

  const content: TipTapNode[] = paragraphs.map((p) => {
    const align = mapAlign(p['a:pPr']?.['@_algn']);
    const para: TipTapNode = { type: 'paragraph' };
    if (align) para.attrs = { textAlign: align };

    const runs = asArray<RawRun>(p['a:r']);
    const nodes: TipTapNode[] = [];
    for (const r of runs) {
      nodes.push(...runToNodes(r, theme));
    }
    if (nodes.length > 0) para.content = nodes;
    return para;
  });

  return { type: 'doc', content };
}

// Извлекает «простой» текст из txBody (без форматирования) — для случаев когда
// мы храним не TipTap-поле (например, в чартовых заголовках), и для тестов.
export function plainTextFromTxBody(txBody: RawTxBody | undefined): string {
  const paragraphs = asArray<RawPara>(txBody?.['a:p']);
  return paragraphs
    .map((p) =>
      asArray<RawRun>(p['a:r'])
        .map((r) => {
          const t = r['a:t'];
          return Array.isArray(t) ? t.join('') : t ?? '';
        })
        .join(''),
    )
    .join('\n');
}
