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

// Рисует контур правильного N-угольника, вписанного в bbox w×h.
function polygon(ctx: Konva.Context, w: number, h: number, sides: number, rot: number): void {
  const cx = w / 2;
  const cy = h / 2;
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

// Контур пятиконечной звезды, вписанной в bbox.
function star(ctx: Konva.Context, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
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

// Контур сердца, вписанного в bbox (две дуги + нижний клин).
function heart(ctx: Konva.Context, w: number, h: number): void {
  const x = (t: number) => (t / 100) * w;
  const y = (t: number) => (t / 100) * h;
  ctx.moveTo(x(50), y(30));
  ctx.bezierCurveTo(x(50), y(22), x(40), y(8), x(22), y(8));
  ctx.bezierCurveTo(x(2), y(8), x(2), y(38), x(2), y(38));
  ctx.bezierCurveTo(x(2), y(58), x(28), y(78), x(50), y(98));
  ctx.bezierCurveTo(x(72), y(78), x(98), y(58), x(98), y(38));
  ctx.bezierCurveTo(x(98), y(38), x(98), y(8), x(78), y(8));
  ctx.bezierCurveTo(x(60), y(8), x(50), y(22), x(50), y(30));
  ctx.closePath();
}

function roundRect(ctx: Konva.Context, w: number, h: number): void {
  const r = Math.min(w, h) * 0.18;
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
}

// Возвращает clipFunc для маски (рисует путь в координатах 0..w, 0..h).
export function maskClipFunc(
  key: MaskKey,
  w: number,
  h: number,
): (ctx: Konva.Context) => void {
  return (ctx: Konva.Context) => {
    switch (key) {
      case 'roundRect':
        roundRect(ctx, w, h);
        break;
      case 'circle':
        // Эллипс, вписанный в bbox.
        ctx.beginPath?.();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2, false);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h / 2);
        ctx.lineTo(w / 2, h);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
        break;
      case 'pentagon':
        polygon(ctx, w, h, 5, -Math.PI / 2);
        break;
      case 'hexagon':
        polygon(ctx, w, h, 6, 0);
        break;
      case 'star5':
        star(ctx, w, h);
        break;
      case 'heart':
        heart(ctx, w, h);
        break;
    }
  };
}
