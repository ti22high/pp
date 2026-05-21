import { useDeckStore } from '@renderer/stores/deck';
import type {
  ConnectorAnchor,
  ConnectorEndpoint,
  ConnectorShape,
  Shape,
} from '@renderer/lib/model/schema';

export interface Pt {
  x: number;
  y: number;
}

// 9 точек привязки фигуры по её bbox: углы, середины сторон, центр.
export function connectionPoints(shape: { x: number; y: number; w: number; h: number }): Record<ConnectorAnchor, Pt> {
  const { x, y, w, h } = shape;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    tl: { x, y },
    tc: { x: cx, y },
    tr: { x: x + w, y },
    ml: { x, y: cy },
    c: { x: cx, y: cy },
    mr: { x: x + w, y: cy },
    bl: { x, y: y + h },
    bc: { x: cx, y: y + h },
    br: { x: x + w, y: y + h },
  };
}

// Координаты конца коннектора: если привязан к фигуре — её точка, иначе x/y.
export function resolveEndpoint(ep: ConnectorEndpoint, shapes: Shape[]): Pt {
  if (ep.shapeId && ep.anchor) {
    const sh = shapes.find((s) => s.id === ep.shapeId);
    if (sh) return connectionPoints(sh)[ep.anchor];
  }
  return { x: ep.x, y: ep.y };
}

// Маршрут elbow горизонтальный (вертикальное колено) или вертикальный.
export function elbowHorizontalFirst(a: Pt, b: Pt): boolean {
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
}

// Промежуточные угловые точки elbow: пользовательские bends или авто-Г.
export function elbowInteriorPoints(a: Pt, b: Pt, bends?: Pt[]): Pt[] {
  if (bends && bends.length > 0) return bends;
  if (elbowHorizontalFirst(a, b)) {
    const mx = (a.x + b.x) / 2;
    return [{ x: mx, y: a.y }, { x: mx, y: b.y }];
  }
  const my = (a.y + b.y) / 2;
  return [{ x: a.x, y: my }, { x: b.x, y: my }];
}

// Точки полилинии коннектора (плоский массив для Konva) по типу маршрута.
export function connectorPoints(
  type: ConnectorShape['connectorType'],
  a: Pt,
  b: Pt,
  bends?: Pt[],
): number[] {
  if (type === 'straight') return [a.x, a.y, b.x, b.y];
  if (type === 'elbow') {
    const interior = elbowInteriorPoints(a, b, bends);
    return [a.x, a.y, ...interior.flatMap((p) => [p.x, p.y]), b.x, b.y];
  }
  // curved: кубическая кривая (контрольные точки по горизонтали).
  const c1x = a.x + (b.x - a.x) * 0.5;
  const c2x = b.x - (b.x - a.x) * 0.5;
  return [a.x, a.y, c1x, a.y, c2x, b.y, b.x, b.y];
}

// bbox по двум концам (для baseShape x/y/w/h).
export function connectorBBox(a: Pt, b: Pt): { x: number; y: number; w: number; h: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

// ── Операции (мутируют draft в immer setState) ────────────────────────────
function withConnector(slideId: string, shapeId: string, fn: (c: ConnectorShape) => void): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const sh = state.deck.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'connector') return;
    fn(sh);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export const connectorOps = {
  setType: (slideId: string, shapeId: string, t: ConnectorShape['connectorType']) =>
    withConnector(slideId, shapeId, (c) => {
      c.connectorType = t;
      c.bends = undefined;
    }),
  toggleArrowStart: (slideId: string, shapeId: string) =>
    withConnector(slideId, shapeId, (c) => {
      c.arrowStart = !c.arrowStart;
    }),
  toggleArrowEnd: (slideId: string, shapeId: string) =>
    withConnector(slideId, shapeId, (c) => {
      c.arrowEnd = !c.arrowEnd;
    }),
};
