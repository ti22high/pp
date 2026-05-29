// Парсер <p:sp> → внутренняя Shape (Спринт B.6).
//
// Стратегия v1: rect/roundRect → rectShape, ellipse → ellipseShape, остальные
// prstGeom → rectShape fallback (визуальная форма теряется, но размер/текст
// сохраняются — пользователь может перерисовать). Полный prstGeom-маппинг
// (~187 ShapeTypes) — Phase 5 item 5.16 lib/pptx/shapes-map.ts.
//
// Placeholder без визуальной заливки/обводки и с текстом считаем textShape.

import { createRect, createEllipse, createText } from '../../model/factory';
import type { Shape, Fill, Stroke } from '../../model/schema';
import type { PptxTheme } from './theme';
import { parseXfrm, parseFill, parseStroke, type RawSpPr, type ParsedFill, type ParsedStroke } from './spPr';
import { parseTxBody, type RawTxBody, type TipTapDoc } from './text';

interface RawNvPr {
  'p:ph'?: { '@_type'?: string; '@_idx'?: string };
}
interface RawNvSpPr {
  'p:nvPr'?: RawNvPr;
}
export interface RawSp {
  'p:nvSpPr'?: RawNvSpPr;
  'p:spPr'?: RawSpPr & { 'a:prstGeom'?: { '@_prst'?: string } };
  'p:txBody'?: RawTxBody;
}

function toFill(p: ParsedFill): Fill {
  if (p.kind === 'none') return { kind: 'none' };
  return { kind: 'solid', color: p.color ?? '#000000' };
}

function toStroke(p: ParsedStroke | undefined): Stroke | undefined {
  if (!p) return undefined;
  return {
    color: p.color,
    width: Math.min(24, Math.max(0, p.width)),
    dash: p.dash === 'dashed' ? [8, 4] : p.dash === 'dotted' ? [2, 4] : undefined,
  };
}

// true если TipTap-doc содержит хотя бы один непустой текстовый узел.
function hasTextContent(doc: TipTapDoc): boolean {
  return doc.content.some((p) => p.content && p.content.some((n) => typeof n.text === 'string' && n.text.length > 0));
}

export function parseSp(sp: RawSp, theme: PptxTheme): Shape | null {
  const spPr = sp['p:spPr'];
  const xfrm = parseXfrm(spPr);
  if (xfrm.w <= 0 || xfrm.h <= 0) return null;

  const fillParsed = parseFill(spPr, theme);
  const strokeParsed = parseStroke(spPr, theme);
  const text = parseTxBody(sp['p:txBody'], theme);
  const hasText = hasTextContent(text);

  const ph = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
  const isPlaceholderTextOnly =
    ph !== undefined && fillParsed.kind === 'none' && !strokeParsed && hasText;

  if (isPlaceholderTextOnly) {
    const t = createText(xfrm.x, xfrm.y, xfrm.w, xfrm.h, '');
    t.tiptapDoc = text;
    if (xfrm.rotation) t.rotation = xfrm.rotation;
    if (xfrm.flipH) t.flipH = true;
    if (xfrm.flipV) t.flipV = true;
    return t;
  }

  const prst = spPr?.['a:prstGeom']?.['@_prst'];
  let shape: Shape;
  if (prst === 'ellipse') {
    shape = createEllipse(xfrm.x, xfrm.y, xfrm.w, xfrm.h);
  } else {
    // rect, roundRect, и любые незнакомые prstGeom → rectShape fallback.
    shape = createRect(xfrm.x, xfrm.y, xfrm.w, xfrm.h);
  }
  // Перезапись fill/stroke результатами парсинга (factory выставляет дефолты).
  shape.fill = toFill(fillParsed);
  const s = toStroke(strokeParsed);
  if (s) shape.stroke = s;
  else delete shape.stroke;

  if (fillParsed.opacity !== undefined && fillParsed.opacity < 1) {
    shape.opacity = fillParsed.opacity;
  }
  if (xfrm.rotation) shape.rotation = xfrm.rotation;
  if (xfrm.flipH) shape.flipH = true;
  if (xfrm.flipV) shape.flipV = true;
  if (hasText) shape.text = text;

  return shape;
}
