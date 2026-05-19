// Команды выравнивания и распределения для multi-выделения.
// Алгоритмы вычисляют новые позиции (x, y) для каждой фигуры — собственно
// мутация в deck-стор выполняется в хуке useMenuCommands (или ином caller-е),
// чтобы align-логика осталась чистой и тестируемой.

import type { Shape } from './model/schema';
import type { ShapeId } from '@shared/types';

export type AlignKind =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

export type DistributeKind = 'horizontal' | 'vertical';

export type AlignResult = Map<ShapeId, { x: number; y: number }>;

// Выравнивание относительно bbox-объединения выбранных фигур (как в Slides):
// alignLeft → все на левый край bbox, alignCenterH → центры по вертикальной
// оси середины bbox, и т.д.
export function alignShapes(shapes: readonly Shape[], kind: AlignKind): AlignResult {
  const result: AlignResult = new Map();
  if (shapes.length < 2) return result;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sh of shapes) {
    if (sh.x < minX) minX = sh.x;
    if (sh.y < minY) minY = sh.y;
    if (sh.x + sh.w > maxX) maxX = sh.x + sh.w;
    if (sh.y + sh.h > maxY) maxY = sh.y + sh.h;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  for (const sh of shapes) {
    let nx = sh.x;
    let ny = sh.y;
    switch (kind) {
      case 'left':
        nx = minX;
        break;
      case 'center-h':
        nx = centerX - sh.w / 2;
        break;
      case 'right':
        nx = maxX - sh.w;
        break;
      case 'top':
        ny = minY;
        break;
      case 'middle':
        ny = centerY - sh.h / 2;
        break;
      case 'bottom':
        ny = maxY - sh.h;
        break;
    }
    result.set(sh.id, { x: nx, y: ny });
  }
  return result;
}

// Распределение: первая и последняя фигуры (по центру оси) остаются на месте,
// промежуточные — на равных расстояниях между ними по центрам. Требует 3+.
export function distributeShapes(
  shapes: readonly Shape[],
  kind: DistributeKind,
): AlignResult {
  const result: AlignResult = new Map();
  if (shapes.length < 3) return result;

  const sorted = [...shapes].sort((a, b) =>
    kind === 'horizontal' ? a.x + a.w / 2 - (b.x + b.w / 2) : a.y + a.h / 2 - (b.y + b.h / 2),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (kind === 'horizontal') {
    const firstCenter = first.x + first.w / 2;
    const lastCenter = last.x + last.w / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const sh = sorted[i];
      const targetCenter = firstCenter + step * i;
      result.set(sh.id, { x: targetCenter - sh.w / 2, y: sh.y });
    }
  } else {
    const firstCenter = first.y + first.h / 2;
    const lastCenter = last.y + last.h / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const sh = sorted[i];
      const targetCenter = firstCenter + step * i;
      result.set(sh.id, { x: sh.x, y: targetCenter - sh.h / 2 });
    }
  }
  return result;
}
