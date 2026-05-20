// Алгоритм smart guides (SPEC §6.10).
//
// Для каждой фигуры считаем 6 anchor-ов: left, centerH, right (по X) и
// top, centerV, bottom (по Y). Для dragged-фигуры (или group-bbox) ищем
// ближайшие anchor-ы среди остальных фигур и краёв слайда. Если расстояние
// меньше threshold — snap (двигаем dragged по дельте, рисуем направляющую).
//
// MVP-упрощения (Phase 2.16):
// - O(N) поиск, без rbush. Достаточно для слайдов с ~десятками фигур.
//   N > 500 — задача Phase 3 (тогда добавим spatial index).
// - Направляющая рисуется на всю длину слайда (а не от мин/макс пары).
// - Поворот фигуры в bbox-расчёт не входит: snap считается по AABB модели.

export interface SnapBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AnchorsX {
  left: number;
  centerH: number;
  right: number;
}
interface AnchorsY {
  top: number;
  centerV: number;
  bottom: number;
}

const X_KEYS: Array<keyof AnchorsX> = ['left', 'centerH', 'right'];
const Y_KEYS: Array<keyof AnchorsY> = ['top', 'centerV', 'bottom'];

function anchorsX(b: SnapBox): AnchorsX {
  return { left: b.x, centerH: b.x + b.w / 2, right: b.x + b.w };
}
function anchorsY(b: SnapBox): AnchorsY {
  return { top: b.y, centerV: b.y + b.h / 2, bottom: b.y + b.h };
}

export interface Guide {
  kind: 'v' | 'h'; // 'v' — вертикальная линия, 'h' — горизонтальная
  pos: number; // x для v, y для h (в координатах слайда)
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

export function computeSnap(
  dragged: SnapBox,
  others: SnapBox[],
  threshold: number,
  userGuides?: { v: number[]; h: number[] },
): SnapResult {
  const da = { ...anchorsX(dragged), ...anchorsY(dragged) };

  let bestDx = 0;
  let bestDxAbs = Infinity;
  let bestDxLine = 0; // x-координата линии для guide
  let bestDy = 0;
  let bestDyAbs = Infinity;
  let bestDyLine = 0;

  for (const o of others) {
    const ox = anchorsX(o);
    const oy = anchorsY(o);

    for (const dk of X_KEYS) {
      for (const ok of X_KEYS) {
        const diff = ox[ok] - da[dk];
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDxAbs) {
          bestDxAbs = abs;
          bestDx = diff;
          bestDxLine = ox[ok];
        }
      }
    }
    for (const dk of Y_KEYS) {
      for (const ok of Y_KEYS) {
        const diff = oy[ok] - da[dk];
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDyAbs) {
          bestDyAbs = abs;
          bestDy = diff;
          bestDyLine = oy[ok];
        }
      }
    }
  }

  // Пользовательские направляющие: каждая вертикальная даёт одну x-anchor-pos,
  // горизонтальная — одну y-anchor-pos. Сравниваем со всеми тремя anchor-ами
  // dragged (left/centerH/right или top/centerV/bottom).
  if (userGuides) {
    for (const g of userGuides.v) {
      for (const dk of X_KEYS) {
        const diff = g - da[dk];
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDxAbs) {
          bestDxAbs = abs;
          bestDx = diff;
          bestDxLine = g;
        }
      }
    }
    for (const g of userGuides.h) {
      for (const dk of Y_KEYS) {
        const diff = g - da[dk];
        const abs = Math.abs(diff);
        if (abs <= threshold && abs < bestDyAbs) {
          bestDyAbs = abs;
          bestDy = diff;
          bestDyLine = g;
        }
      }
    }
  }

  const guides: Guide[] = [];
  if (bestDxAbs <= threshold) guides.push({ kind: 'v', pos: bestDxLine });
  if (bestDyAbs <= threshold) guides.push({ kind: 'h', pos: bestDyLine });

  return {
    dx: bestDxAbs <= threshold ? bestDx : 0,
    dy: bestDyAbs <= threshold ? bestDy : 0,
    guides,
  };
}

// Привязка одного значения-координаты (ребра bbox) к ближайшей цели в
// пределах threshold. Возвращает привязанное значение и саму цель (для
// рисования направляющей) либо null, если ничего не подошло.
export function snapEdge(
  value: number,
  targets: number[],
  threshold: number,
): { value: number; line: number | null } {
  let best = value;
  let bestAbs = threshold;
  let line: number | null = null;
  for (const t of targets) {
    const abs = Math.abs(t - value);
    if (abs <= bestAbs) {
      bestAbs = abs;
      best = t;
      line = t;
    }
  }
  return { value: best, line };
}

// Объединённый bbox набора фигур (для multi-drag).
export function unionBox(boxes: SnapBox[]): SnapBox | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
