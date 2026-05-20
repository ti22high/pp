import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { ChartType } from '@renderer/lib/model/schema';

// Импорт графиков из .xlsx (Phase 3.14c). Распаковываем книгу (JSZip), читаем
// xl/charts/chartN.xml (fast-xml-parser) и достаём тип + категории + серии из
// кэшей (numCache/strCache). Без живой связи — данные копируются внутрь .gslx.

export interface ChartImport {
  chartType: ChartType;
  categories: string[];
  series: { name: string; data: number[] }[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

// Нормализует значение в массив (fast-xml-parser даёт объект для одного узла).
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

// Достаёт точки из кэша (strCache/numCache) по idx → плотный массив.
function cachePoints(cache: unknown): string[] {
  const c = cache as { pt?: unknown } | undefined;
  if (!c) return [];
  const pts = toArray(c.pt as { '@_idx'?: string; v?: unknown }[] | undefined);
  const out: string[] = [];
  for (const p of pts) {
    const idx = Number(p['@_idx'] ?? 0);
    out[idx] = String((p as { v?: unknown }).v ?? '');
  }
  for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
  return out;
}

function refCache(ref: unknown, kind: 'strCache' | 'numCache'): string[] {
  const r = ref as Record<string, unknown> | undefined;
  if (!r) return [];
  // ref может быть strRef или numRef.
  const inner = (r.strRef ?? r.numRef) as Record<string, unknown> | undefined;
  if (!inner) return [];
  return cachePoints(inner[kind] ?? inner.numCache ?? inner.strCache);
}

// Определяет наш тип графика по тегу plotArea и группировке.
function mapType(tag: string, grouping: string | undefined, barDir: string | undefined): ChartType {
  const stacked = grouping === 'stacked' || grouping === 'percentStacked';
  switch (tag) {
    case 'barChart':
      if (barDir === 'bar') return stacked ? 'stackedBar' : 'bar';
      return stacked ? 'stackedColumn' : 'column';
    case 'lineChart':
      return 'line';
    case 'areaChart':
      return stacked ? 'stackedArea' : 'area';
    case 'pieChart':
      return 'pie';
    case 'doughnutChart':
      return 'doughnut';
    case 'scatterChart':
      return 'scatter';
    case 'radarChart':
      return 'radar';
    default:
      return 'column';
  }
}

// Парсит один chartSpace XML в ChartImport (или null).
export function parseChartXml(xml: string): ChartImport | null {
  const root = parser.parse(xml) as Record<string, unknown>;
  const chartSpace = root.chartSpace as Record<string, unknown> | undefined;
  const plotArea = ((chartSpace?.chart as Record<string, unknown> | undefined)?.plotArea ??
    {}) as Record<string, unknown>;

  const CHART_TAGS = [
    'barChart',
    'lineChart',
    'areaChart',
    'pieChart',
    'doughnutChart',
    'scatterChart',
    'radarChart',
  ];
  const tag = CHART_TAGS.find((t) => plotArea[t]);
  if (!tag) return null;
  const node = plotArea[tag] as Record<string, unknown>;

  const grouping = (node.grouping as { '@_val'?: string } | undefined)?.['@_val'];
  const barDir = (node.barDir as { '@_val'?: string } | undefined)?.['@_val'];
  const chartType = mapType(tag, grouping, barDir);

  const sers = toArray(node.ser as Record<string, unknown> | Record<string, unknown>[] | undefined);
  let categories: string[] = [];
  const series: { name: string; data: number[] }[] = [];

  sers.forEach((ser, i) => {
    const name =
      refCache(ser.tx, 'strCache')[0] ??
      (ser.tx as { v?: unknown } | undefined)?.v?.toString() ??
      `Серия ${i + 1}`;
    const cats = refCache(ser.cat, 'strCache');
    if (cats.length > categories.length) categories = cats;
    const vals = refCache(ser.val ?? ser.yVal, 'numCache').map((v) => Number(v) || 0);
    series.push({ name: String(name), data: vals });
  });

  if (series.length === 0) return null;
  if (categories.length === 0) {
    const maxLen = Math.max(...series.map((s) => s.data.length), 1);
    categories = Array.from({ length: maxLen }, (_, i) => `Кат. ${i + 1}`);
  }
  // Выравниваем длину данных под число категорий.
  series.forEach((s) => {
    while (s.data.length < categories.length) s.data.push(0);
  });
  return { chartType, categories, series };
}

// Извлекает все графики из .xlsx-буфера.
export async function parseXlsxCharts(buf: ArrayBuffer): Promise<ChartImport[]> {
  const zip = await JSZip.loadAsync(buf);
  const charts: ChartImport[] = [];
  const files = Object.keys(zip.files).filter((n) => /xl\/charts\/chart\d+\.xml$/i.test(n));
  for (const name of files.sort()) {
    const xml = await zip.files[name].async('string');
    const parsed = parseChartXml(xml);
    if (parsed) charts.push(parsed);
  }
  return charts;
}
