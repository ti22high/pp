import * as XLSX from 'xlsx';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createTable } from '@renderer/lib/model/factory';

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
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return [];
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach((td) => {
      cells.push((td.textContent ?? '').replace(/\s+/g, ' ').trim());
    });
    if (cells.length > 0) rows.push(cells);
  });
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? ''));
}

// Достаёт табличные данные из ClipboardData (Excel/Sheets/paste). Сначала
// пробует HTML-таблицу (точнее), потом TSV из text/plain (есть табы).
// Возвращает null, если в буфере не таблица.
export function tableRowsFromClipboard(cd: DataTransfer): string[][] | null {
  const html = cd.getData('text/html');
  if (html && /<table[\s>]/i.test(html)) {
    const rows = parseHtmlTable(html);
    if (rows.length > 0) return rows;
  }
  const text = cd.getData('text/plain');
  if (text && text.includes('\t')) {
    const rows = parseCsv(text);
    if (rows.length > 0) return rows;
  }
  return null;
}

// Является ли файл CSV (по типу или расширению).
export function isCsvFile(file: File): boolean {
  return file.type === 'text/csv' || /\.csv$/i.test(file.name);
}

// Вставляет таблицу из матрицы строк на активный слайд по центру.
export function insertTableFromRows(rows: string[][]): void {
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
      table.cells[r][c].text = rows[r][c] ?? '';
    }
  }
  useDeckStore.getState().setDeck(appendShape(deck, slideId, table));
  useSelectionStore.getState().select([table.id]);
}
