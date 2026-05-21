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

// w/h — размеры bbox, cx/cy — центр градиента в локальных координатах ноды
// (Rect: w/2,h/2; Ellipse: 0,0 — её origin в центре; Path: центр natural-bbox).
export function resolveFill(
  fill: Fill | undefined,
  w = 100,
  h = 100,
  cx = w / 2,
  cy = h / 2,
): FillProps {
  if (!fill || fill.kind === 'none') {
    return { fill: undefined, fillPriority: 'color' };
  }
  if (fill.kind === 'solid') {
    return { fill: fill.color, fillPriority: 'color' };
  }
  if (fill.kind === 'gradient') {
    // Konva требует стопы по возрастанию позиции.
    const stops = [...fill.stops].sort((a, b) => a.pos - b.pos).flatMap((s) => [s.pos, s.color]);
    if (fill.type === 'linear') {
      // Угол в градусах: 0 = сверху-вниз, по часовой.
      const rad = ((fill.angle ?? 0) * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      return {
        fillLinearGradientStartPoint: { x: cx - (dx * w) / 2, y: cy - (dy * h) / 2 },
        fillLinearGradientEndPoint: { x: cx + (dx * w) / 2, y: cy + (dy * h) / 2 },
        fillLinearGradientColorStops: stops,
        fillPriority: 'linear-gradient',
      };
    }
    return {
      fillRadialGradientStartPoint: { x: cx, y: cy },
      fillRadialGradientEndPoint: { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: Math.max(w, h) / 2,
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
