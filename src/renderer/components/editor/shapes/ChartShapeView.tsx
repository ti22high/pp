import { memo, type ReactNode } from 'react';
import { Rect, Line, Text, Wedge, Arc, Circle } from 'react-konva';
import type { ChartShape } from '@renderer/lib/model/schema';
import { CHART_PALETTE } from '@renderer/lib/model/factory';
import { formatChartNumber } from '@renderer/lib/chart';
import { ShapeNode } from './ShapeNode';

interface ChartShapeViewProps {
  shape: ChartShape;
  slideId: string;
}

const AXIS_COLOR = '#bdc1c6';
const GRID_COLOR = '#e8eaed';
const LABEL_COLOR = '#5f6368';
const F = 12;

function sColor(shape: ChartShape, i: number): string {
  return shape.series[i]?.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
}

type Rect4 = { x: number; y: number; w: number; h: number };

// Рендер диаграммы примитивами Konva. Базовые + расширенные типы (Phase
// 3.14a), заголовок/легенда/подписи данных (Phase 3.14b).
export const ChartShapeView = memo(function ChartShapeViewBase({ shape, slideId }: ChartShapeViewProps) {
  const { w, h } = shape;
  const els: ReactNode[] = [];

  const titlePos = shape.titlePosition ?? 'top';
  const titleTopH = shape.title && titlePos === 'top' ? 24 : 0;
  const titleBotH = shape.title && titlePos === 'bottom' ? 24 : 0;
  const legendPos = shape.legendPosition ?? 'top';
  const isPieLike = shape.chartType === 'pie' || shape.chartType === 'doughnut';
  const legendItems = isPieLike
    ? shape.categories.map((name, i) => ({ name, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
    : shape.series.map((s, i) => ({ name: s.name, color: sColor(shape, i) }));
  const showLegend = shape.showLegend && legendItems.length > 0;

  // Раскладка: заголовок сверху, легенда по позиции, остальное — область графика.
  const legW = showLegend && (legendPos === 'left' || legendPos === 'right')
    ? Math.min(160, 24 + Math.max(...legendItems.map((it) => it.name.length)) * 7)
    : 0;
  const legH = showLegend && (legendPos === 'top' || legendPos === 'bottom') ? 22 : 0;

  const plot: Rect4 = {
    x: legendPos === 'left' ? legW : 0,
    y: titleTopH + (legendPos === 'top' ? legH : 0),
    w: w - legW,
    h: h - titleTopH - titleBotH - legH,
  };

  // Заголовок (сверху или снизу).
  if (shape.title) {
    els.push(
      <Text key="title" x={0} y={titlePos === 'top' ? 5 : h - 20} width={w} align="center" text={shape.title} fontSize={15} fontStyle="bold" fill="#202124" />,
    );
  }

  // Легенда.
  if (showLegend) {
    const horizontal = legendPos === 'top' || legendPos === 'bottom';
    const ly = legendPos === 'bottom' ? h - 18 - titleBotH : legendPos === 'top' ? titleTopH + 3 : titleTopH + 6;
    const lx0 = legendPos === 'right' ? w - legW + 8 : 8;
    let lx = lx0;
    let lyv = ly;
    legendItems.forEach((it, i) => {
      els.push(<Rect key={`ls${i}`} x={horizontal ? lx : lx0} y={horizontal ? ly : lyv} width={11} height={11} fill={it.color} cornerRadius={2} />);
      els.push(<Text key={`lt${i}`} x={(horizontal ? lx : lx0) + 15} y={(horizontal ? ly : lyv) + 1} text={it.name} fontSize={F} fill={LABEL_COLOR} />);
      if (horizontal) lx += 15 + it.name.length * 7 + 16;
      else lyv += 18;
    });
  }

  if (isPieLike) els.push(...renderPie(shape, plot, shape.chartType === 'doughnut'));
  else if (shape.chartType === 'radar') els.push(...renderRadar(shape, plot));
  else els.push(...renderCartesian(shape, plot));

  return (
    <ShapeNode id={shape.id} slideId={slideId} x={shape.x} y={shape.y} w={w} h={h} rotation={shape.rotation} opacity={shape.opacity} locked={shape.locked}>
      <Rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={AXIS_COLOR} strokeWidth={1} />
      {els}
    </ShapeNode>
  );
});

function renderPie(shape: ChartShape, plot: Rect4, doughnut: boolean): ReactNode[] {
  const data = shape.series[0]?.data ?? [];
  const total = data.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const radius = Math.max(10, Math.min(plot.w, plot.h) / 2 - 12);
  const inner = doughnut ? radius * 0.55 : 0;
  const els: ReactNode[] = [];
  let angle = -90;
  data.forEach((v, i) => {
    const slice = (Math.max(0, v) / total) * 360;
    const color = CHART_PALETTE[i % CHART_PALETTE.length];
    if (doughnut) {
      els.push(<Arc key={`pw${i}`} x={cx} y={cy} innerRadius={inner} outerRadius={radius} angle={slice} rotation={angle} fill={color} stroke="#fff" strokeWidth={1} />);
    } else {
      els.push(<Wedge key={`pw${i}`} x={cx} y={cy} radius={radius} angle={slice} rotation={angle} fill={color} stroke="#fff" strokeWidth={1} />);
    }
    if (shape.dataLabels && slice > 8) {
      const mid = ((angle + slice / 2) * Math.PI) / 180;
      const lr = doughnut ? (inner + radius) / 2 : radius * 0.62;
      els.push(
        <Text key={`pl${i}`} x={cx + Math.cos(mid) * lr - 16} y={cy + Math.sin(mid) * lr - 6} width={32} align="center" text={`${Math.round((Math.max(0, v) / total) * 100)}%`} fontSize={F} fill="#fff" />,
      );
    }
    angle += slice;
  });
  return els;
}

function renderRadar(shape: ChartShape, plot: Rect4): ReactNode[] {
  const cats = shape.categories;
  const n = cats.length;
  if (n < 3) return [];
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const radius = Math.max(10, Math.min(plot.w, plot.h) / 2 - 20);
  const maxVal = Math.max(1, ...shape.series.flatMap((s) => s.data));
  const els: ReactNode[] = [];
  const angleAt = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);

  // Кольца + спицы.
  for (let ring = 1; ring <= 4; ring++) {
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = angleAt(i);
      pts.push(cx + Math.cos(a) * radius * (ring / 4), cy + Math.sin(a) * radius * (ring / 4));
    }
    els.push(<Line key={`rr${ring}`} points={pts} closed stroke={GRID_COLOR} strokeWidth={1} />);
  }
  cats.forEach((cat, i) => {
    const a = angleAt(i);
    els.push(<Line key={`rs${i}`} points={[cx, cy, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]} stroke={GRID_COLOR} strokeWidth={1} />);
    els.push(<Text key={`rc${i}`} x={cx + Math.cos(a) * (radius + 4) - 30} y={cy + Math.sin(a) * (radius + 4) - 6} width={60} align="center" text={cat} fontSize={F} fill={LABEL_COLOR} />);
  });
  shape.series.forEach((s, si) => {
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = angleAt(i);
      const r = (Math.max(0, s.data[i] ?? 0) / maxVal) * radius;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    els.push(<Line key={`rp${si}`} points={pts} closed stroke={sColor(shape, si)} strokeWidth={2} fill={sColor(shape, si)} opacity={0.18} />);
  });
  return els;
}

function renderCartesian(shape: ChartShape, plot: Rect4): ReactNode[] {
  const t = shape.chartType;
  const horizontal = t === 'bar' || t === 'stackedBar';
  const stacked = t === 'stackedColumn' || t === 'stackedBar' || t === 'stackedArea';
  const padL = 44;
  const padR = 12;
  const padT = 8;
  const padB = 26 + (shape.axisXTitle ? 16 : 0);
  const x0 = plot.x + padL;
  const y0 = plot.y + padT;
  const x1 = plot.x + plot.w - padR;
  const y1 = plot.y + plot.h - padB;
  const plotW = Math.max(1, x1 - x0);
  const plotH = Math.max(1, y1 - y0);
  const els: ReactNode[] = [];

  // Максимум: для stacked — сумма по категории.
  let maxVal: number;
  if (stacked) {
    maxVal = Math.max(1, ...shape.categories.map((_, ci) => shape.series.reduce((sum, s) => sum + Math.max(0, s.data[ci] ?? 0), 0)));
  } else {
    maxVal = Math.max(1, ...shape.series.flatMap((s) => s.data.map((v) => Math.max(0, v))));
  }

  const valLen = horizontal ? plotW : plotH;
  const valPx = (v: number) => (Math.max(0, v) / maxVal) * valLen;

  const DIV = 5;
  for (let i = 0; i <= DIV; i++) {
    const frac = i / DIV;
    const val = formatChartNumber(maxVal * frac, shape.numberFormat);
    if (horizontal) {
      const gx = x0 + plotW * frac;
      if (shape.showGridlines) els.push(<Line key={`g${i}`} points={[gx, y0, gx, y1]} stroke={GRID_COLOR} strokeWidth={1} />);
      els.push(<Text key={`vl${i}`} x={gx - 20} y={y1 + 5} width={40} align="center" text={val} fontSize={F} fill={LABEL_COLOR} />);
    } else {
      const gy = y1 - plotH * frac;
      if (shape.showGridlines) els.push(<Line key={`g${i}`} points={[x0, gy, x1, gy]} stroke={GRID_COLOR} strokeWidth={1} />);
      els.push(<Text key={`vl${i}`} x={plot.x} y={gy - 6} width={padL - 4} align="right" text={val} fontSize={F} fill={LABEL_COLOR} />);
    }
  }
  els.push(<Line key="ax" points={[x0, y1, x1, y1]} stroke={AXIS_COLOR} strokeWidth={1} />);
  els.push(<Line key="ay" points={[x0, y0, x0, y1]} stroke={AXIS_COLOR} strokeWidth={1} />);

  const n = shape.categories.length;
  const bandW = (horizontal ? plotH : plotW) / Math.max(1, n);

  shape.categories.forEach((cat, i) => {
    if (horizontal) {
      const cy = y0 + bandW * (i + 0.5);
      els.push(<Text key={`cl${i}`} x={plot.x} y={cy - 6} width={padL - 4} align="right" text={cat} fontSize={F} fill={LABEL_COLOR} />);
    } else {
      const cx = x0 + bandW * (i + 0.5);
      els.push(<Text key={`cl${i}`} x={cx - bandW / 2} y={y1 + 5} width={bandW} align="center" text={cat} fontSize={F} fill={LABEL_COLOR} />);
    }
  });
  if (shape.axisXTitle) els.push(<Text key="axt" x={x0} y={plot.y + plot.h - 14} width={plotW} align="center" text={shape.axisXTitle} fontSize={F} fill={LABEL_COLOR} />);

  const lbl = (key: string, x: number, y: number, v: number) =>
    shape.dataLabels ? <Text key={key} x={x - 18} y={y} width={36} align="center" text={formatChartNumber(v, shape.numberFormat)} fontSize={F} fill={LABEL_COLOR} /> : null;

  if (t === 'column' || t === 'bar') {
    const gp = bandW * 0.15;
    const bw = (bandW - gp * 2) / Math.max(1, shape.series.length);
    shape.categories.forEach((_, ci) => {
      shape.series.forEach((s, si) => {
        const v = s.data[ci] ?? 0;
        const len = valPx(v);
        if (horizontal) {
          const by = y0 + bandW * ci + gp + bw * si;
          els.push(<Rect key={`b${ci}-${si}`} x={x0} y={by} width={len} height={bw * 0.9} fill={sColor(shape, si)} />);
        } else {
          const bx = x0 + bandW * ci + gp + bw * si;
          els.push(<Rect key={`b${ci}-${si}`} x={bx} y={y1 - len} width={bw * 0.9} height={len} fill={sColor(shape, si)} />);
          if (shape.dataLabels) els.push(lbl(`dl${ci}-${si}`, bx + bw * 0.45, y1 - len - 14, v));
        }
      });
    });
  } else if (t === 'stackedColumn' || t === 'stackedBar') {
    const gp = bandW * 0.15;
    const bw = bandW - gp * 2;
    shape.categories.forEach((_, ci) => {
      let acc = 0;
      shape.series.forEach((s, si) => {
        const v = Math.max(0, s.data[ci] ?? 0);
        const len = valPx(v);
        if (horizontal) {
          els.push(<Rect key={`sb${ci}-${si}`} x={x0 + valPx(acc)} y={y0 + bandW * ci + gp} width={len} height={bw} fill={sColor(shape, si)} />);
        } else {
          els.push(<Rect key={`sb${ci}-${si}`} x={x0 + bandW * ci + gp} y={y1 - valPx(acc) - len} width={bw} height={len} fill={sColor(shape, si)} />);
        }
        acc += v;
      });
    });
  } else if (t === 'stackedArea') {
    const acc = shape.categories.map(() => 0);
    shape.series.forEach((s, si) => {
      const top: Array<[number, number]> = [];
      const bottom: Array<[number, number]> = [];
      shape.categories.forEach((_, ci) => {
        const cx = x0 + bandW * (ci + 0.5);
        bottom.push([cx, y1 - valPx(acc[ci])]);
        acc[ci] += Math.max(0, s.data[ci] ?? 0);
        top.push([cx, y1 - valPx(acc[ci])]);
      });
      // Полигон: верхняя кромка слева-направо + нижняя справа-налево.
      const poly = [...top, ...bottom.reverse()].flat();
      els.push(<Line key={`sa${si}`} points={poly} closed fill={sColor(shape, si)} opacity={0.5} stroke={sColor(shape, si)} strokeWidth={1} />);
    });
  } else if (t === 'line' || t === 'area' || t === 'scatterLine') {
    shape.series.forEach((s, si) => {
      const pts: number[] = [];
      shape.categories.forEach((_, ci) => {
        pts.push(x0 + bandW * (ci + 0.5), y1 - valPx(s.data[ci] ?? 0));
      });
      if (t === 'area') {
        els.push(<Line key={`ar${si}`} points={[x0 + bandW * 0.5, y1, ...pts, x0 + bandW * (n - 0.5), y1]} closed fill={sColor(shape, si)} opacity={0.25} />);
      }
      els.push(<Line key={`ln${si}`} points={pts} stroke={sColor(shape, si)} strokeWidth={2} lineJoin="round" lineCap="round" />);
      if (t === 'scatterLine' || shape.dataLabels) {
        shape.categories.forEach((_, ci) => {
          const cx = x0 + bandW * (ci + 0.5);
          const cy = y1 - valPx(s.data[ci] ?? 0);
          if (t === 'scatterLine') els.push(<Circle key={`sp${si}-${ci}`} x={cx} y={cy} radius={3} fill={sColor(shape, si)} />);
          if (shape.dataLabels) els.push(lbl(`dl${si}-${ci}`, cx, cy - 16, s.data[ci] ?? 0));
        });
      }
    });
  } else if (t === 'scatter' || t === 'bubble') {
    const maxForR = Math.max(1, ...shape.series.flatMap((s) => s.data));
    shape.series.forEach((s, si) => {
      shape.categories.forEach((_, ci) => {
        const v = s.data[ci] ?? 0;
        const cx = x0 + bandW * (ci + 0.5);
        const cy = y1 - valPx(v);
        const r = t === 'bubble' ? 4 + (Math.max(0, v) / maxForR) * 18 : 4;
        els.push(<Circle key={`sc${si}-${ci}`} x={cx} y={cy} radius={r} fill={sColor(shape, si)} opacity={t === 'bubble' ? 0.6 : 1} />);
      });
    });
  } else if (t === 'combo') {
    // Серия 0 — столбцы, остальные — линии.
    const gp = bandW * 0.2;
    const bw = bandW - gp * 2;
    shape.categories.forEach((_, ci) => {
      const v = shape.series[0]?.data[ci] ?? 0;
      els.push(<Rect key={`cb${ci}`} x={x0 + bandW * ci + gp} y={y1 - valPx(v)} width={bw} height={valPx(v)} fill={sColor(shape, 0)} />);
    });
    shape.series.slice(1).forEach((s, idx) => {
      const si = idx + 1;
      const pts: number[] = [];
      shape.categories.forEach((_, ci) => pts.push(x0 + bandW * (ci + 0.5), y1 - valPx(s.data[ci] ?? 0)));
      els.push(<Line key={`cl${si}`} points={pts} stroke={sColor(shape, si)} strokeWidth={2} lineJoin="round" />);
    });
  }

  return els;
}
