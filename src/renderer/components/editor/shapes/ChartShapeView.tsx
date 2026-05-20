import { memo, type ReactNode } from 'react';
import { Rect, Line, Text, Wedge, Circle } from 'react-konva';
import type { ChartShape } from '@renderer/lib/model/schema';
import { CHART_PALETTE } from '@renderer/lib/model/factory';
import { ShapeNode } from './ShapeNode';

interface ChartShapeViewProps {
  shape: ChartShape;
  slideId: string;
}

const AXIS_COLOR = '#bdc1c6';
const GRID_COLOR = '#e8eaed';
const LABEL_COLOR = '#5f6368';
const LABEL_FONT = 12;

function seriesColor(shape: ChartShape, i: number): string {
  return shape.series[i]?.color ?? CHART_PALETTE[i % CHART_PALETTE.length];
}

// Рендер диаграммы примитивами Konva. Все 6 типов: column/bar/line/area/pie/
// scatter. Координаты — локальные (0..w / 0..h) внутри ShapeNode.
export const ChartShapeView = memo(function ChartShapeViewBase({ shape, slideId }: ChartShapeViewProps) {
  const { w, h, chartType, categories, series } = shape;
  const legendH = shape.showLegend ? 22 : 0;
  const isPie = chartType === 'pie';

  const els: ReactNode[] = [];

  // Легенда сверху (для pie — подписи категорий, иначе — серии).
  if (shape.showLegend) {
    const items = isPie
      ? categories.map((name, i) => ({ name, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
      : series.map((s, i) => ({ name: s.name, color: seriesColor(shape, i) }));
    let lx = 12;
    items.forEach((it, i) => {
      els.push(
        <Rect key={`ls${i}`} x={lx} y={6} width={12} height={12} fill={it.color} cornerRadius={2} />,
      );
      els.push(
        <Text key={`lt${i}`} x={lx + 16} y={6} text={it.name} fontSize={LABEL_FONT} fill={LABEL_COLOR} />,
      );
      lx += 16 + it.name.length * 7 + 18;
    });
  }

  if (isPie) {
    els.push(...renderPie(shape, w, h, legendH));
  } else {
    els.push(...renderCartesian(shape, w, h, legendH));
  }

  return (
    <ShapeNode
      id={shape.id}
      slideId={slideId}
      x={shape.x}
      y={shape.y}
      w={w}
      h={h}
      rotation={shape.rotation}
      opacity={shape.opacity}
      locked={shape.locked}
    >
      <Rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke={AXIS_COLOR} strokeWidth={1} />
      {els}
    </ShapeNode>
  );
});

// Круговая диаграмма: series[0] по категориям.
function renderPie(shape: ChartShape, w: number, h: number, legendH: number): ReactNode[] {
  const data = shape.series[0]?.data ?? [];
  const total = data.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const cx = w / 2;
  const cy = legendH + (h - legendH) / 2;
  const radius = Math.max(10, Math.min(w, h - legendH) / 2 - 16);
  const els: ReactNode[] = [];
  let angle = -90; // старт сверху
  data.forEach((v, i) => {
    const slice = (Math.max(0, v) / total) * 360;
    els.push(
      <Wedge
        key={`pw${i}`}
        x={cx}
        y={cy}
        radius={radius}
        angle={slice}
        rotation={angle}
        fill={CHART_PALETTE[i % CHART_PALETTE.length]}
        stroke="#ffffff"
        strokeWidth={1}
      />,
    );
    angle += slice;
  });
  return els;
}

// Декартовы типы: column/bar/line/area/scatter.
function renderCartesian(shape: ChartShape, w: number, h: number, legendH: number): ReactNode[] {
  const { chartType, categories, series } = shape;
  const horizontal = chartType === 'bar';
  const padL = 44;
  const padR = 12;
  const padT = legendH + 8;
  const padB = 28 + (shape.axisXTitle ? 16 : 0);
  const x0 = padL;
  const y0 = padT;
  const x1 = w - padR;
  const y1 = h - padB;
  const plotW = Math.max(1, x1 - x0);
  const plotH = Math.max(1, y1 - y0);

  const allVals = series.flatMap((s) => s.data);
  const maxVal = Math.max(1, ...allVals.map((v) => Math.max(0, v)));
  const els: ReactNode[] = [];

  // Значение → координата вдоль оси значений.
  const valLen = horizontal ? plotW : plotH;
  const valPx = (v: number) => (Math.max(0, v) / maxVal) * valLen;

  // Сетка + подписи значений (5 делений).
  const DIV = 5;
  for (let i = 0; i <= DIV; i++) {
    const t = i / DIV;
    const val = Math.round(maxVal * t);
    if (horizontal) {
      const gx = x0 + plotW * t;
      if (shape.showGridlines)
        els.push(<Line key={`g${i}`} points={[gx, y0, gx, y1]} stroke={GRID_COLOR} strokeWidth={1} />);
      els.push(<Text key={`vl${i}`} x={gx - 16} y={y1 + 6} width={32} align="center" text={String(val)} fontSize={LABEL_FONT} fill={LABEL_COLOR} />);
    } else {
      const gy = y1 - plotH * t;
      if (shape.showGridlines)
        els.push(<Line key={`g${i}`} points={[x0, gy, x1, gy]} stroke={GRID_COLOR} strokeWidth={1} />);
      els.push(<Text key={`vl${i}`} x={0} y={gy - 6} width={padL - 6} align="right" text={String(val)} fontSize={LABEL_FONT} fill={LABEL_COLOR} />);
    }
  }

  // Оси.
  els.push(<Line key="ax" points={[x0, y1, x1, y1]} stroke={AXIS_COLOR} strokeWidth={1} />);
  els.push(<Line key="ay" points={[x0, y0, x0, y1]} stroke={AXIS_COLOR} strokeWidth={1} />);

  const n = categories.length;
  const bandW = (horizontal ? plotH : plotW) / Math.max(1, n);

  // Подписи категорий.
  categories.forEach((cat, i) => {
    if (horizontal) {
      const cy = y0 + bandW * (i + 0.5);
      els.push(<Text key={`cl${i}`} x={0} y={cy - 6} width={padL - 6} align="right" text={cat} fontSize={LABEL_FONT} fill={LABEL_COLOR} />);
    } else {
      const cx = x0 + bandW * (i + 0.5);
      els.push(<Text key={`cl${i}`} x={cx - bandW / 2} y={y1 + 6} width={bandW} align="center" text={cat} fontSize={LABEL_FONT} fill={LABEL_COLOR} />);
    }
  });

  // Заголовки осей.
  if (shape.axisXTitle)
    els.push(<Text key="axt" x={x0} y={h - 16} width={plotW} align="center" text={shape.axisXTitle} fontSize={LABEL_FONT} fill={LABEL_COLOR} />);

  if (chartType === 'column' || chartType === 'bar') {
    const groupPad = bandW * 0.15;
    const barW = (bandW - groupPad * 2) / Math.max(1, series.length);
    categories.forEach((_, ci) => {
      series.forEach((s, si) => {
        const v = s.data[ci] ?? 0;
        const len = valPx(v);
        if (horizontal) {
          const by = y0 + bandW * ci + groupPad + barW * si;
          els.push(<Rect key={`b${ci}-${si}`} x={x0} y={by} width={len} height={barW * 0.9} fill={seriesColor(shape, si)} />);
        } else {
          const bx = x0 + bandW * ci + groupPad + barW * si;
          els.push(<Rect key={`b${ci}-${si}`} x={bx} y={y1 - len} width={barW * 0.9} height={len} fill={seriesColor(shape, si)} />);
        }
      });
    });
  } else if (chartType === 'line' || chartType === 'area') {
    series.forEach((s, si) => {
      const pts: number[] = [];
      categories.forEach((_, ci) => {
        const cx = x0 + bandW * (ci + 0.5);
        const cy = y1 - valPx(s.data[ci] ?? 0);
        pts.push(cx, cy);
      });
      if (chartType === 'area') {
        const areaPts = [x0 + bandW * 0.5, y1, ...pts, x0 + bandW * (categories.length - 0.5), y1];
        els.push(<Line key={`ar${si}`} points={areaPts} closed fill={seriesColor(shape, si)} opacity={0.25} />);
      }
      els.push(<Line key={`ln${si}`} points={pts} stroke={seriesColor(shape, si)} strokeWidth={2} lineJoin="round" lineCap="round" />);
    });
  } else if (chartType === 'scatter') {
    series.forEach((s, si) => {
      categories.forEach((_, ci) => {
        const cx = x0 + bandW * (ci + 0.5);
        const cy = y1 - valPx(s.data[ci] ?? 0);
        els.push(<Circle key={`sc${si}-${ci}`} x={cx} y={cy} radius={4} fill={seriesColor(shape, si)} />);
      });
    });
  }

  return els;
}
