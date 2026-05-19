// Команды Z-order для выделенных фигур.
// В модели порядок рисования = порядок в массиве `slide.shapes`
// (первая → снизу, последняя → сверху). Функции возвращают новый порядок;
// мутация массива — в caller-е (useMenuCommands).

import type { ShapeId } from '@shared/types';

export type ZOrderKind = 'to-front' | 'forward' | 'backward' | 'to-back';

// Сортирует ids выделения в порядке их появления в shapes-массиве —
// нужно, чтобы при перемещении группы относительный z-order сохранился.
function sortByCurrentOrder(ids: readonly ShapeId[], order: readonly ShapeId[]): ShapeId[] {
  const idx = new Map(order.map((id, i) => [id, i] as const));
  return [...ids].sort((a, b) => (idx.get(a) ?? 0) - (idx.get(b) ?? 0));
}

// Перемещение IDS в новом массиве. Возвращает новый порядок (массив ShapeId).
export function reorderZ(
  currentOrder: readonly ShapeId[],
  selectedIds: readonly ShapeId[],
  kind: ZOrderKind,
): ShapeId[] {
  if (selectedIds.length === 0) return [...currentOrder];
  const selSet = new Set(selectedIds);
  // Селекция в текущем порядке (важно для group-операций).
  const movingSorted = sortByCurrentOrder(selectedIds, currentOrder);
  // Остальные фигуры — в исходном порядке.
  const rest = currentOrder.filter((id) => !selSet.has(id));

  switch (kind) {
    case 'to-front':
      // Выделенные — в самый конец массива (= верх z-стека).
      return [...rest, ...movingSorted];
    case 'to-back':
      return [...movingSorted, ...rest];
    case 'forward': {
      // Каждую выделенную фигуру двигаем на 1 позицию вверх, начиная
      // с самой верхней (иначе они «съедают» друг друга при сдвиге).
      const next = [...currentOrder];
      for (let i = next.length - 2; i >= 0; i--) {
        if (selSet.has(next[i]) && !selSet.has(next[i + 1])) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
      return next;
    }
    case 'backward': {
      const next = [...currentOrder];
      for (let i = 1; i < next.length; i++) {
        if (selSet.has(next[i]) && !selSet.has(next[i - 1])) {
          [next[i], next[i - 1]] = [next[i - 1], next[i]];
        }
      }
      return next;
    }
  }
}
