// Утилиты для работы с groupId-плоской моделью группировки.
// Группы — это набор фигур, у которых одинаковый optional `groupId`.
// Клик по любой члену группы → выделение всей группы (см. Canvas).

import type { Shape } from './model/schema';
import type { ShapeId } from '@shared/types';

// Расширяет набор id-ов до полных групп: если в `ids` есть фигура с groupId,
// добавляет всех остальных членов её группы.
export function expandToGroups(
  ids: readonly ShapeId[],
  shapes: readonly Shape[],
): ShapeId[] {
  if (ids.length === 0) return [];
  const idSet = new Set(ids);
  const groupIds = new Set<string>();
  for (const sh of shapes) {
    if (idSet.has(sh.id) && sh.groupId) {
      groupIds.add(sh.groupId);
    }
  }
  if (groupIds.size === 0) return [...ids];
  const out = new Set(ids);
  for (const sh of shapes) {
    if (sh.groupId && groupIds.has(sh.groupId)) {
      out.add(sh.id);
    }
  }
  return [...out];
}

// Возвращает true если можно сгруппировать выбранные фигуры (2+ и хотя бы
// одна без groupId / разные groupId-ы).
export function canGroup(ids: readonly ShapeId[], shapes: readonly Shape[]): boolean {
  if (ids.length < 2) return false;
  const idSet = new Set(ids);
  const groups = new Set<string | undefined>();
  for (const sh of shapes) {
    if (idSet.has(sh.id)) groups.add(sh.groupId);
  }
  // Если все в одной группе и нет «свободных» — нечего группировать.
  if (groups.size === 1 && !groups.has(undefined)) return false;
  return true;
}

// Возвращает true если выделение содержит хотя бы одну фигуру с groupId.
export function canUngroup(ids: readonly ShapeId[], shapes: readonly Shape[]): boolean {
  const idSet = new Set(ids);
  for (const sh of shapes) {
    if (idSet.has(sh.id) && sh.groupId) return true;
  }
  return false;
}
