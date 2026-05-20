import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createChart, CHART_PALETTE } from '@renderer/lib/model/factory';
import type { ChartShape, ChartType, TableShape } from '@renderer/lib/model/schema';

// Операции над данными/настройками диаграммы (Phase 3.12–3.14). Мутируют draft
// внутри immer setState.

function withChart(slideId: string, shapeId: string, fn: (c: ChartShape) => void): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'chart') return;
    fn(sh);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export const chartOps = {
  setType: (slideId: string, shapeId: string, t: ChartType) =>
    withChart(slideId, shapeId, (c) => {
      c.chartType = t;
    }),
  setValue: (slideId: string, shapeId: string, s: number, cat: number, v: number) =>
    withChart(slideId, shapeId, (c) => {
      if (c.series[s]) c.series[s].data[cat] = v;
    }),
  setCategoryName: (slideId: string, shapeId: string, idx: number, name: string) =>
    withChart(slideId, shapeId, (c) => {
      c.categories[idx] = name;
    }),
  setSeriesName: (slideId: string, shapeId: string, idx: number, name: string) =>
    withChart(slideId, shapeId, (c) => {
      if (c.series[idx]) c.series[idx].name = name;
    }),
  setSeriesColor: (slideId: string, shapeId: string, idx: number, color: string) =>
    withChart(slideId, shapeId, (c) => {
      if (c.series[idx]) c.series[idx].color = color;
    }),
  addCategory: (slideId: string, shapeId: string) =>
    withChart(slideId, shapeId, (c) => {
      c.categories.push(`Кат. ${c.categories.length + 1}`);
      c.series.forEach((s) => s.data.push(0));
    }),
  removeCategory: (slideId: string, shapeId: string, idx: number) =>
    withChart(slideId, shapeId, (c) => {
      if (c.categories.length <= 1) return;
      c.categories.splice(idx, 1);
      c.series.forEach((s) => s.data.splice(idx, 1));
    }),
  addSeries: (slideId: string, shapeId: string) =>
    withChart(slideId, shapeId, (c) => {
      c.series.push({
        name: `Серия ${c.series.length + 1}`,
        color: CHART_PALETTE[c.series.length % CHART_PALETTE.length],
        data: c.categories.map(() => 0),
      });
    }),
  removeSeries: (slideId: string, shapeId: string, idx: number) =>
    withChart(slideId, shapeId, (c) => {
      if (c.series.length <= 1) return;
      c.series.splice(idx, 1);
    }),
  toggleLegend: (slideId: string, shapeId: string) =>
    withChart(slideId, shapeId, (c) => {
      c.showLegend = !c.showLegend;
    }),
  toggleGridlines: (slideId: string, shapeId: string) =>
    withChart(slideId, shapeId, (c) => {
      c.showGridlines = !c.showGridlines;
    }),
  setAxisTitle: (slideId: string, shapeId: string, axis: 'x' | 'y', title: string) =>
    withChart(slideId, shapeId, (c) => {
      const t = title.trim() === '' ? undefined : title;
      if (axis === 'x') c.axisXTitle = t;
      else c.axisYTitle = t;
    }),
  setTitle: (slideId: string, shapeId: string, title: string) =>
    withChart(slideId, shapeId, (c) => {
      c.title = title.trim() === '' ? undefined : title;
    }),
  setTitlePosition: (slideId: string, shapeId: string, pos: 'top' | 'bottom') =>
    withChart(slideId, shapeId, (c) => {
      c.titlePosition = pos;
    }),
  setLegendPosition: (slideId: string, shapeId: string, pos: 'top' | 'bottom' | 'left' | 'right') =>
    withChart(slideId, shapeId, (c) => {
      c.legendPosition = pos;
      c.showLegend = true;
    }),
  toggleDataLabels: (slideId: string, shapeId: string) =>
    withChart(slideId, shapeId, (c) => {
      c.dataLabels = !c.dataLabels;
    }),
  setNumberFormat: (
    slideId: string,
    shapeId: string,
    fmt: 'auto' | 'integer' | 'percent' | 'thousands',
  ) =>
    withChart(slideId, shapeId, (c) => {
      c.numberFormat = fmt;
    }),
};

// Форматирование числа подписи по numberFormat диаграммы.
export function formatChartNumber(v: number, fmt: string | undefined): string {
  switch (fmt) {
    case 'integer':
      return String(Math.round(v));
    case 'percent':
      return `${Math.round(v)}%`;
    case 'thousands':
      return Math.round(v).toLocaleString('ru-RU');
    default:
      return String(Math.round(v * 100) / 100);
  }
}

// Строит данные диаграммы из текстовой матрицы таблицы. Соглашение: первая
// строка — заголовки серий, первый столбец — категории (если они нечисловые).
export function chartDataFromRows(rows: string[][]): {
  categories: string[];
  series: { name: string; data: number[] }[];
} {
  if (rows.length === 0) return { categories: [], series: [] };
  const isNum = (s: string) => (s ?? '').trim() !== '' && !Number.isNaN(Number((s ?? '').replace(',', '.')));
  const num = (s: string) => Number((s ?? '').replace(',', '.')) || 0;
  const cols = Math.max(...rows.map((r) => r.length));
  const hasHeaderRow = rows[0].slice(1).some((c) => !isNum(c));
  const hasHeaderCol = rows.slice(hasHeaderRow ? 1 : 0).some((r) => r[0] !== undefined && !isNum(r[0]));
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const c0 = hasHeaderCol ? 1 : 0;
  const categories = dataRows.map((r, i) => (hasHeaderCol ? r[0] || `Кат. ${i + 1}` : `Кат. ${i + 1}`));
  const series: { name: string; data: number[] }[] = [];
  for (let c = c0; c < cols; c++) {
    const name = hasHeaderRow ? rows[0][c] || `Серия ${c}` : `Серия ${c - c0 + 1}`;
    series.push({ name: String(name), data: dataRows.map((r) => num(r[c])) });
  }
  return { categories, series };
}

// Создаёт редактируемую диаграмму из таблицы и вставляет рядом.
export function insertChartFromTable(slideId: string, table: TableShape): void {
  const deck = useDeckStore.getState().deck;
  if (!deck) return;
  const rows = table.cells.map((r) => r.map((c) => c.text));
  const { categories, series } = chartDataFromRows(rows);
  if (series.length === 0) return;
  const w = Math.min(640, deck.size.w * 0.5);
  const h = Math.min(400, deck.size.h * 0.5);
  const x = Math.round(Math.min(table.x, deck.size.w - w));
  const y = Math.round(Math.min(table.y + table.h + 20, deck.size.h - h));
  const chart = createChart(x, y, w, h, 'column');
  chart.categories = categories;
  chart.series = series.map((s, i) => ({
    name: s.name,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
    data: s.data,
  }));
  useDeckStore.getState().setDeck(appendShape(deck, slideId, chart));
  useSelectionStore.getState().select([chart.id]);
}
