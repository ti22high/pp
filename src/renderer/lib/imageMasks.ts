import type Konva from 'konva';

// Маски для обрезки изображения по форме (Phase 3.3). Каждая маска рисует
// контур в локальных координатах фигуры (0..w, 0..h) — используется как
// clipFunc у Konva.Group вокруг картинки. Полная галерея ~187 фигур —
// Phase 3.20; здесь практичный базовый набор.

export type MaskKey =
  | 'roundRect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star5'
  | 'heart';

export interface MaskOption {
  key: MaskKey;
  label: string;
}

export const MASK_OPTIONS: MaskOption[] = [
  { key: 'roundRect', label: 'Скруглённый' },
  { key: 'circle', label: 'Эллипс / круг' },
  { key: 'triangle', label: 'Треугольник' },
  { key: 'diamond', label: 'Ромб' },
  { key: 'pentagon', label: 'Пятиугольник' },
  { key: 'hexagon', label: 'Шестиугольник' },
  { key: 'star5', label: 'Звезда' },
  { key: 'heart', label: 'Сердце' },
];

// Все функции рисуют контур, вписанный в bbox (ox, oy, w, h). ox/oy — смещение
// (для ImageShapeView = 0, для CropOverlay = позиция рамки в slide-coords).
function polygon(ctx: Konva.Context, ox: number, oy: number, w: number, h: number, sides: number, rot: number): void {
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides;
    const px = cx + rx * Math.cos(a);
    const py = cy + ry * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star(ctx: Konva.Context, ox: number, oy: number, w: number, h: number): void {
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  const outerX = w / 2;
  const outerY = h / 2;
  const inner = 0.5;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 === 0 ? 1 : inner;
    const px = cx + outerX * k * Math.cos(a);
    const py = cy + outerY * k * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heart(ctx: Konva.Context, ox: number, oy: number, w: number, h: number): void {
  const x = (t: number) => ox + (t / 100) * w;
  const y = (t: number) => oy + (t / 100) * h;
  ctx.moveTo(x(50), y(30));
  ctx.bezierCurveTo(x(50), y(22), x(40), y(8), x(22), y(8));
  ctx.bezierCurveTo(x(2), y(8), x(2), y(38), x(2), y(38));
  ctx.bezierCurveTo(x(2), y(58), x(28), y(78), x(50), y(98));
  ctx.bezierCurveTo(x(72), y(78), x(98), y(58), x(98), y(38));
  ctx.bezierCurveTo(x(98), y(38), x(98), y(8), x(78), y(8));
  ctx.bezierCurveTo(x(60), y(8), x(50), y(22), x(50), y(30));
  ctx.closePath();
}

function roundRect(ctx: Konva.Context, ox: number, oy: number, w: number, h: number): void {
  const r = Math.min(w, h) * 0.18;
  ctx.moveTo(ox + r, oy);
  ctx.lineTo(ox + w - r, oy);
  ctx.arcTo(ox + w, oy, ox + w, oy + r, r);
  ctx.lineTo(ox + w, oy + h - r);
  ctx.arcTo(ox + w, oy + h, ox + w - r, oy + h, r);
  ctx.lineTo(ox + r, oy + h);
  ctx.arcTo(ox, oy + h, ox, oy + h - r, r);
  ctx.lineTo(ox, oy + r);
  ctx.arcTo(ox, oy, ox + r, oy, r);
  ctx.closePath();
}

// Возвращает clipFunc для маски (рисует путь в координатах bbox ox..ox+w).
export function maskClipFunc(
  key: MaskKey,
  ox: number,
  oy: number,
  w: number,
  h: number,
): (ctx: Konva.Context) => void {
  return (ctx: Konva.Context) => {
    switch (key) {
      case 'roundRect':
        roundRect(ctx, ox, oy, w, h);
        break;
      case 'circle':
        ctx.beginPath?.();
        ctx.ellipse(ox + w / 2, oy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2, false);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(ox + w / 2, oy);
        ctx.lineTo(ox + w, oy + h);
        ctx.lineTo(ox, oy + h);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(ox + w / 2, oy);
        ctx.lineTo(ox + w, oy + h / 2);
        ctx.lineTo(ox + w / 2, oy + h);
        ctx.lineTo(ox, oy + h / 2);
        ctx.closePath();
        break;
      case 'pentagon':
        polygon(ctx, ox, oy, w, h, 5, -Math.PI / 2);
        break;
      case 'hexagon':
        polygon(ctx, ox, oy, w, h, 6, 0);
        break;
      case 'star5':
        star(ctx, ox, oy, w, h);
        break;
      case 'heart':
        heart(ctx, ox, oy, w, h);
        break;
    }
  };
}
