import * as XLSX from 'xlsx';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createTable } from '@renderer/lib/model/factory';
import type { CellFormat } from '@renderer/lib/table';

// Распарсенная таблица: текст ячеек + (опц.) формат каждой ячейки.
export interface ParsedTable {
  text: string[][];
  fmt?: (CellFormat | undefined)[][];
}

// CSS-цвет → hex (#rrggbb), т.к. colorSchema принимает только hex/имена.
// rgb()/rgba() конвертируем; именованные и hex пропускаем; прозрачный → undefined.
function cssColorToHex(c: string | null | undefined): string | undefined {
  if (!c) return undefined;
  const v = c.trim().toLowerCase();
  if (v === '' || v === 'transparent') return undefined;
  // rgba с нулевой альфой — прозрачно (4 компонента, последний 0).
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(v)) return undefined;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + v.slice(1).split('').map((h) => h + h).join('');
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('');
  if (/^[a-z]+$/.test(v)) return v; // именованный цвет
  return undefined;
}

function mapAlign(v: string | undefined): CellFormat['align'] | undefined {
  if (v === 'left' || v === 'center' || v === 'right' || v === 'justify') return v;
  return undefined;
}
function mapValign(v: string | undefined): CellFormat['valign'] | undefined {
  if (v === 'top' || v === 'bottom') return v;
  if (v === 'middle' || v === 'center') return 'middle';
  return undefined;
}

// Размер шрифта из CSS (px/pt/число) → px. pt → px ≈ ×1.333.
function fontSizeToPx(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^([\d.]+)\s*(px|pt)?$/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return undefined;
  return m[2]?.toLowerCase() === 'pt' ? Math.round(n * 1.333) : Math.round(n);
}

// Извлекает формат ячейки из HTML (фон, выравнивание + стили текста: цвет,
// шрифт, размер, жирность, курсив) — inline-style, атрибуты и теги b/strong/i/em.
function cellFormatFromTd(td: HTMLTableCellElement): CellFormat | undefined {
  const st = td.style;
  // Стили могут лежать на вложенном span/font (Excel так делает) — берём первый.
  const inner = td.querySelector<HTMLElement>('[style], font, b, strong, i, em');
  const innerSt = inner?.style;

  const fill = cssColorToHex(st.backgroundColor) ?? cssColorToHex(td.getAttribute('bgcolor'));
  const align = mapAlign(st.textAlign || td.getAttribute('align') || undefined);
  const valign = mapValign(st.verticalAlign || td.getAttribute('valign') || undefined);
  const color =
    cssColorToHex(st.color) ??
    cssColorToHex(innerSt?.color) ??
    cssColorToHex(td.querySelector('font')?.getAttribute('color'));
  const weight = st.fontWeight || innerSt?.fontWeight || '';
  const bold =
    weight === 'bold' || weight === 'bolder' || (Number(weight) >= 600) ||
    !!td.querySelector('b, strong')
      ? true
      : undefined;
  const italic =
    st.fontStyle === 'italic' || innerSt?.fontStyle === 'italic' || !!td.querySelector('i, em')
      ? true
      : undefined;
  // font-family: берём первый шрифт из списка, убираем кавычки.
  const ff = (st.fontFamily || innerSt?.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
  const fontFamily = ff || undefined;
  const fontSize = fontSizeToPx(st.fontSize || innerSt?.fontSize || undefined);

  const fmt: CellFormat = {};
  if (fill) fmt.fill = fill;
  if (align) fmt.align = align;
  if (valign) fmt.valign = valign;
  if (color) fmt.color = color;
  if (bold) fmt.bold = true;
  if (italic) fmt.italic = true;
  if (fontFamily) fmt.fontFamily = fontFamily;
  if (fontSize) fmt.fontSize = fontSize;
  return Object.keys(fmt).length > 0 ? fmt : undefined;
}

// Импорт CSV как таблицы (Phase 3.11). Парсинг — через SheetJS (умеет кавычки,
// разделители, переносы строк). Drag-n-drop .csv → диалог «Вставить как
// таблицу» (CsvImportDialog) → вставка таблицы с данными.

// Парсит CSV-текст в матрицу строк (с выравниванием по самой длинной строке).
export function parseCsv(text: string): string[][] {
  // Срезаем BOM (UTF-8/UTF-16), иначе он прилипает к первой ячейке.
  const clean = text.replace(/^\uFEFF/, '');
  const wb = XLSX.read(clean, { type: 'string' });
  const wsName = wb.SheetNames[0];
  const ws = wsName ? wb.Sheets[wsName] : undefined;
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: '',
  });
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) =>
    Array.from({ length: cols }, (_, c) => String(r[c] ?? '')),
  );
}

// Читает CSV-файл и открывает диалог подтверждения вставки.
export function openCsvImport(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result ?? ''));
    if (rows.length > 0) useUiStore.getState().setCsvImportRows(rows);
  };
  reader.readAsText(file);
}

// Парсит HTML-таблицу (из буфера Excel/Sheets, формат text/html) в матрицу
// строк. Spans (rowspan/colspan) игнорируем — берём текст ячеек как есть.
export function parseHtmlTable(html: string): string[][] {
  return parseHtmlTableRich(html).text;
}

// Разбирает HTML-таблицу в текст + формат (фон/выравнивание) каждой ячейки.
// Цвет/шрифт/жирность текста НЕ переносятся — в модели ячейки пока только
// фон, граница, padding, выравнивание (текст — простая строка).
export function parseHtmlTableRich(html: string): ParsedTable {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return { text: [] };
  const text: string[][] = [];
  const fmt: (CellFormat | undefined)[][] = [];
  table.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = [];
    const fmts: (CellFormat | undefined)[] = [];
    tr.querySelectorAll('th, td').forEach((td) => {
      cells.push((td.textContent ?? '').replace(/\s+/g, ' ').trim());
      fmts.push(cellFormatFromTd(td as HTMLTableCellElement));
    });
    if (cells.length > 0) {
      text.push(cells);
      fmt.push(fmts);
    }
  });
  const cols = text.reduce((m, r) => Math.max(m, r.length), 0);
  return {
    text: text.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? '')),
    fmt: fmt.map((r) => Array.from({ length: cols }, (_, c) => r[c])),
  };
}

// Достаёт табличные данные из ClipboardData (Excel/Sheets/paste). Сначала
// пробует HTML-таблицу (точнее, с фоном/выравниванием), потом TSV из
// text/plain. Возвращает null, если в буфере не таблица.
export function tableRowsFromClipboard(cd: DataTransfer): ParsedTable | null {
  const html = cd.getData('text/html');
  if (html && /<table[\s>]/i.test(html)) {
    const parsed = parseHtmlTableRich(html);
    if (parsed.text.length > 0) return parsed;
  }
  const text = cd.getData('text/plain');
  if (text && text.includes('\t')) {
    const rows = parseCsv(text);
    if (rows.length > 0) return { text: rows };
  }
  return null;
}

// Является ли файл CSV (по типу или расширению).
export function isCsvFile(file: File): boolean {
  return file.type === 'text/csv' || /\.csv$/i.test(file.name);
}

// Является ли файл книгой Excel.
export function isXlsxFile(file: File): boolean {
  return /\.xlsx?$/i.test(file.name);
}

// Конвертирует worksheet в матрицу строк (значения; стили в free-SheetJS не
// читаются).
function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: '',
  });
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => Array.from({ length: cols }, (_, c) => String(r[c] ?? '')));
}

// Читает .xlsx-файл и открывает диалог выбора листа/диапазона (Phase 3.11b).
export function openXlsxImport(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const data = new Uint8Array(reader.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: 'array' });
    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: sheetToRows(wb.Sheets[name]),
    })).filter((s) => s.rows.length > 0);
    if (sheets.length > 0) {
      useUiStore.getState().setXlsxImport({ fileName: file.name, sheets });
    }
  };
  reader.readAsArrayBuffer(file);
}

// Применяет диапазон в A1-нотации ("A1:C10") к матрице строк. Пустая/невалидная
// строка → вся матрица.
export function applyA1Range(rows: string[][], range: string): string[][] {
  const m = range.trim().match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
  if (!m) return rows;
  const colIdx = (s: string) =>
    s
      .toUpperCase()
      .split('')
      .reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  const c0 = colIdx(m[1]);
  const r0 = Number(m[2]) - 1;
  const c1 = colIdx(m[3]);
  const r1 = Number(m[4]) - 1;
  const rMin = Math.min(r0, r1);
  const rMax = Math.max(r0, r1);
  const cMin = Math.min(c0, c1);
  const cMax = Math.max(c0, c1);
  return rows
    .slice(rMin, rMax + 1)
    .map((r) => r.slice(cMin, cMax + 1));
}

// Вставляет таблицу из матрицы строк на активный слайд по центру. fmt —
// опциональный формат ячеек (фон/выравнивание из HTML-буфера Excel/Sheets).
export function insertTableFromRows(
  rows: string[][],
  fmt?: (CellFormat | undefined)[][],
): void {
  const deck = useDeckStore.getState().deck;
  const slideId = useUiStore.getState().activeSlideId;
  if (!deck || !slideId || rows.length === 0) return;

  const nRows = rows.length;
  const nCols = Math.max(1, ...rows.map((r) => r.length));
  const w = Math.min(nCols * 200, deck.size.w * 0.9);
  const h = Math.min(nRows * 56, deck.size.h * 0.9);
  const x = Math.round((deck.size.w - w) / 2);
  const y = Math.round((deck.size.h - h) / 2);

  const table = createTable(x, y, w, h, nRows, nCols);
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const cell = table.cells[r][c];
      cell.text = rows[r][c] ?? '';
      const f = fmt?.[r]?.[c];
      if (f) {
        if (f.fill) cell.fill = f.fill;
        if (f.align) cell.align = f.align;
        if (f.valign) cell.valign = f.valign;
        if (f.color) cell.color = f.color;
        if (f.bold) cell.bold = true;
        if (f.italic) cell.italic = true;
        if (f.fontFamily) cell.fontFamily = f.fontFamily;
        if (f.fontSize) cell.fontSize = f.fontSize;
      }
    }
  }
  useDeckStore.getState().setDeck(appendShape(deck, slideId, table));
  useSelectionStore.getState().select([table.id]);
}
