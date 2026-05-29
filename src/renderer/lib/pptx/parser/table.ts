// Парсер таблиц <p:graphicFrame> с <a:tbl> внутри (Спринт B.8).
//
// PowerPoint таблица = grid колонок (a:tblGrid) + строки (a:tr) с ячейками
// (a:tc). Каждая ячейка содержит <a:txBody>. Ширины колонок и высоты строк
// заданы в EMU; мы конвертируем в доли (fraction) от ширины/высоты фигуры —
// чтобы resize таблицы пропорционально тянул сетку (Phase 3.8).

import { createTable } from '../../model/factory';
import type { TableShape, TableCell } from '../../model/schema';
import { emuToPx, sizeToPt } from './emu';
import { plainTextFromTxBody, type RawTxBody } from './text';
import type { PptxTheme } from './theme';
import { resolveSchemeColor } from './theme';

interface RawXfrmGf {
  'a:off'?: { '@_x'?: string; '@_y'?: string };
  'a:ext'?: { '@_cx'?: string; '@_cy'?: string };
}
interface RawGridCol {
  '@_w'?: string;
}
interface RawSolidFill {
  'a:srgbClr'?: { '@_val'?: string };
  'a:schemeClr'?: { '@_val'?: string };
}
interface RawCellPr {
  '@_anchor'?: string; // valign: t|ctr|b
  '@_marL'?: string;
  'a:solidFill'?: RawSolidFill;
  // Левая/правая/верхняя/нижняя обводки (берём первую найденную как общий border).
  'a:lnL'?: { '@_w'?: string; 'a:solidFill'?: RawSolidFill };
  'a:lnR'?: { '@_w'?: string; 'a:solidFill'?: RawSolidFill };
  'a:lnT'?: { '@_w'?: string; 'a:solidFill'?: RawSolidFill };
  'a:lnB'?: { '@_w'?: string; 'a:solidFill'?: RawSolidFill };
}
interface RawTc {
  '@_gridSpan'?: string;
  '@_rowSpan'?: string;
  '@_vMerge'?: string;
  '@_hMerge'?: string;
  'a:tcPr'?: RawCellPr;
  'a:txBody'?: RawTxBody;
}
interface RawTr {
  '@_h'?: string;
  'a:tc'?: RawTc[];
}
interface RawTbl {
  'a:tblGrid'?: { 'a:gridCol'?: RawGridCol[] };
  'a:tr'?: RawTr[];
}
export interface RawGraphicFrame {
  'p:xfrm'?: RawXfrmGf;
  'a:graphic'?: {
    'a:graphicData'?: {
      '@_uri'?: string;
      // a:tbl в ALWAYS_ARRAY → массив (как правило один элемент).
      'a:tbl'?: RawTbl[];
    };
  };
}

const TABLE_URI = 'http://schemas.openxmlformats.org/drawingml/2006/table';

// Извлекает hex (без '#') из solidFill с резолвом темы.
function fillHex(fill: RawSolidFill | undefined, theme: PptxTheme): string | undefined {
  if (!fill) return undefined;
  const srgb = fill['a:srgbClr']?.['@_val'];
  if (srgb) return `#${srgb.toLowerCase()}`;
  const scheme = fill['a:schemeClr']?.['@_val'];
  if (scheme) return `#${resolveSchemeColor(theme, scheme)}`;
  return undefined;
}

// Маппинг tcPr.anchor → valign.
function mapValign(a: string | undefined): TableCell['valign'] {
  if (a === 't') return 'top';
  if (a === 'b') return 'bottom';
  if (a === 'ctr') return 'middle';
  return undefined;
}

// Шрифт/размер/жирный/курсив/цвет из первого run первого параграфа txBody.
function styleFromFirstRun(
  tx: RawTxBody | undefined,
  theme: PptxTheme,
): {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  align?: TableCell['align'];
} {
  const p = tx?.['a:p']?.[0];
  if (!p) return {};
  const r = p['a:r']?.[0];
  const rPr = r?.['a:rPr'];
  const out: ReturnType<typeof styleFromFirstRun> = {};
  if (rPr?.['@_b'] === '1') out.bold = true;
  if (rPr?.['@_i'] === '1') out.italic = true;
  const font = rPr?.['a:latin']?.['@_typeface'];
  if (font) out.fontFamily = font;
  if (rPr?.['@_sz']) out.fontSize = sizeToPt(rPr['@_sz']);
  const color = fillHex(rPr?.['a:solidFill'], theme);
  if (color) out.color = color;
  const algn = p['a:pPr']?.['@_algn'];
  if (algn === 'l') out.align = 'left';
  else if (algn === 'ctr') out.align = 'center';
  else if (algn === 'r') out.align = 'right';
  else if (algn === 'just') out.align = 'justify';
  return out;
}

export function parseGraphicFrameTable(
  gf: RawGraphicFrame,
  theme: PptxTheme,
): TableShape | null {
  const data = gf['a:graphic']?.['a:graphicData'];
  if (!data || data['@_uri'] !== TABLE_URI) return null;
  const tbl = data['a:tbl']?.[0];
  if (!tbl) return null;

  const x = emuToPx(gf['p:xfrm']?.['a:off']?.['@_x']);
  const y = emuToPx(gf['p:xfrm']?.['a:off']?.['@_y']);
  const w = emuToPx(gf['p:xfrm']?.['a:ext']?.['@_cx']);
  const h = emuToPx(gf['p:xfrm']?.['a:ext']?.['@_cy']);
  if (w <= 0 || h <= 0) return null;

  // Колонки.
  const gridCols = tbl['a:tblGrid']?.['a:gridCol'] ?? [];
  const colWidthsEmu = gridCols.map((g) => (g['@_w'] ? parseInt(g['@_w'], 10) : 0));
  const totalColEmu = colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const colFractions = colWidthsEmu.map((cw) => cw / totalColEmu);

  // Строки и ячейки.
  const trs = tbl['a:tr'] ?? [];
  const rowHeightsEmu = trs.map((tr) => (tr['@_h'] ? parseInt(tr['@_h'], 10) : 0));
  const totalRowEmu = rowHeightsEmu.reduce((a, b) => a + b, 0) || 1;
  const rowFractions = rowHeightsEmu.map((rh) => rh / totalRowEmu);

  const rows = trs.length;
  const cols = colFractions.length;
  if (rows < 1 || cols < 1) return null;

  const cells: TableCell[][] = trs.map((tr) => {
    const tcs = tr['a:tc'] ?? [];
    return tcs.slice(0, cols).map((tc): TableCell => {
      const isMerged = tc['@_hMerge'] === '1' || tc['@_vMerge'] === '1';
      const text = plainTextFromTxBody(tc['a:txBody']);
      const style = styleFromFirstRun(tc['a:txBody'], theme);
      const cellFill = fillHex(tc['a:tcPr']?.['a:solidFill'], theme);
      const valign = mapValign(tc['a:tcPr']?.['@_anchor']);
      const colSpan = tc['@_gridSpan'] ? parseInt(tc['@_gridSpan'], 10) : undefined;
      const rowSpan = tc['@_rowSpan'] ? parseInt(tc['@_rowSpan'], 10) : undefined;
      // Берём левую границу как общую (упрощение для v1; PowerPoint часто
      // задаёт одинаковые границы по всем 4-м сторонам ячейки).
      const ln = tc['a:tcPr']?.['a:lnL'];
      const borderColor = fillHex(ln?.['a:solidFill'], theme);
      const borderWidth = ln?.['@_w'] ? emuToPx(ln['@_w']) : undefined;
      return {
        text,
        ...(colSpan && colSpan > 1 ? { colSpan } : {}),
        ...(rowSpan && rowSpan > 1 ? { rowSpan } : {}),
        ...(isMerged ? { merged: true } : {}),
        ...(cellFill ? { fill: cellFill } : {}),
        ...(borderColor ? { borderColor } : {}),
        ...(borderWidth !== undefined ? { borderWidth } : {}),
        ...(valign ? { valign } : {}),
        ...style,
      };
    });
  });

  // createTable выставляет дефолтные cells; перезаписываем.
  const shape = createTable(x, y, w, h, rows, cols);
  shape.colFractions = colFractions;
  shape.rowFractions = rowFractions;
  shape.cells = cells;
  return shape;
}
