// Парсер графиков <p:graphicFrame> с <a:graphic> chart-uri (Спринт B.9).
//
// "Графики как графики" — переиспользуем уже работающий парсер xlsxCharts.ts
// (тот же `<c:chartSpace>` XML). После парсинга оборачиваем в наш ChartShape с
// палитрой CHART_PALETTE. Преобразует категории и серии 1-в-1.

import { parseChartXml } from '../../xlsxCharts';
import { createChart, CHART_PALETTE } from '../../model/factory';
import type { ChartShape } from '../../model/schema';
import { emuToPx } from './emu';
import type { PptxArchive } from './zip';
import type { PptxRelationship } from './rels';
import { resolveRelTarget } from './rels';

interface RawXfrmGf {
  'a:off'?: { '@_x'?: string; '@_y'?: string };
  'a:ext'?: { '@_cx'?: string; '@_cy'?: string };
}
export interface RawGraphicFrameChart {
  'p:xfrm'?: RawXfrmGf;
  'a:graphic'?: {
    'a:graphicData'?: {
      '@_uri'?: string;
      'c:chart'?: { '@_r:id'?: string };
    };
  };
}

export interface ChartContext {
  archive: PptxArchive;
  slideRelsPath: string;
  rels: Map<string, PptxRelationship>;
}

const CHART_URI = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

export async function parseGraphicFrameChart(
  gf: RawGraphicFrameChart,
  ctx: ChartContext,
): Promise<ChartShape | null> {
  const data = gf['a:graphic']?.['a:graphicData'];
  if (!data || data['@_uri'] !== CHART_URI) return null;

  const rId = data['c:chart']?.['@_r:id'];
  if (!rId) return null;
  const rel = ctx.rels.get(rId);
  if (!rel) return null;

  const chartPath = resolveRelTarget(ctx.slideRelsPath, rel.target);
  const xml = await ctx.archive.getText(chartPath);
  if (!xml) return null;

  const data2 = parseChartXml(xml);
  if (!data2) return null;

  const x = emuToPx(gf['p:xfrm']?.['a:off']?.['@_x']);
  const y = emuToPx(gf['p:xfrm']?.['a:off']?.['@_y']);
  const w = emuToPx(gf['p:xfrm']?.['a:ext']?.['@_cx']);
  const h = emuToPx(gf['p:xfrm']?.['a:ext']?.['@_cy']);
  if (w <= 0 || h <= 0) return null;

  const shape = createChart(x, y, w, h, data2.chartType);
  shape.categories = data2.categories;
  shape.series = data2.series.map((s, i) => ({
    name: s.name,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
    data: s.data,
  }));
  return shape;
}
