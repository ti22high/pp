// Утилиты маппинга нашей модели Fill/Stroke в Konva-props.
// Используется всеми <ShapeView> компонентами.
// Gradient-конвертация: Konva принимает массив [stop, color, stop, color, ...].

import type { Fill, Stroke, Shadow } from '@renderer/lib/model/schema';

export interface FillProps {
  fill?: string;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: Array<number | string>;
  fillRadialGradientStartPoint?: { x: number; y: number };
  fillRadialGradientEndPoint?: { x: number; y: number };
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndRadius?: number;
  fillRadialGradientColorStops?: Array<number | string>;
  fillPriority?: 'color' | 'linear-gradient' | 'radial-gradient' | 'pattern';
}

export interface StrokeProps {
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
}

export function resolveFill(fill: Fill | undefined): FillProps {
  if (!fill || fill.kind === 'none') {
    return { fill: undefined, fillPriority: 'color' };
  }
  if (fill.kind === 'solid') {
    return { fill: fill.color, fillPriority: 'color' };
  }
  if (fill.kind === 'gradient') {
    // Координаты градиента считаем относительно bounding box фигуры в долях [0..1];
    // Konva ожидает абсолютные значения — фигуры передают свой bbox через размеры.
    // На пункте 2.6 — простое решение: линейный сверху-вниз / радиальный из центра.
    const stops = fill.stops.flatMap((s) => [s.pos, s.color]);
    if (fill.type === 'linear') {
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 0, y: 1 },
        fillLinearGradientColorStops: stops,
        fillPriority: 'linear-gradient',
      };
    }
    return {
      fillRadialGradientStartPoint: { x: 0.5, y: 0.5 },
      fillRadialGradientEndPoint: { x: 0.5, y: 0.5 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: 1,
      fillRadialGradientColorStops: stops,
      fillPriority: 'radial-gradient',
    };
  }
  if (fill.kind === 'image') {
    // image-заливка появится в 3.19; здесь — заглушка серым.
    return { fill: '#e0e0e0', fillPriority: 'color' };
  }
  return {};
}

export function resolveStroke(stroke: Stroke | undefined): StrokeProps {
  if (!stroke) return {};
  return {
    stroke: stroke.color,
    strokeWidth: stroke.width,
    dash: stroke.dash,
  };
}

export interface ShadowProps {
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
}

// Маппинг нашей Shadow → Konva shadow-props. Konva принимает opacity отдельно;
// если в модели нет — оставляем undefined (Konva возьмёт 1).
export function resolveShadow(shadow: Shadow | undefined): ShadowProps {
  if (!shadow) return {};
  return {
    shadowColor: shadow.color,
    shadowBlur: shadow.blur,
    shadowOffsetX: shadow.offsetX,
    shadowOffsetY: shadow.offsetY,
    shadowOpacity: shadow.opacity,
  };
}
