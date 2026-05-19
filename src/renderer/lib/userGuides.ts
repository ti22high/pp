// Операции над пользовательскими направляющими (deck.guides).
// Не путать с `useGuidesStore` из stores/guides.ts — там временные
// розовые smart-guide-линии, исчезающие после drag-а. Эти — постоянные
// синие направляющие, которые пользователь добавляет вручную (§1.12).

import { useDeckStore } from '@renderer/stores/deck';
import type { UserGuide } from '@renderer/lib/model/schema';

function uid(): string {
  return `ug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Возвращает текущий массив guides (всегда массив, даже если в модели undefined).
export function getUserGuides(): UserGuide[] {
  return useDeckStore.getState().deck?.guides ?? [];
}

// Добавляет направляющую. По умолчанию — по центру слайда. Возвращает id.
export function addUserGuide(kind: 'h' | 'v', pos?: number): string {
  const id = uid();
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const fallback =
      kind === 'v' ? state.deck.size.w / 2 : state.deck.size.h / 2;
    const next: UserGuide = { id, kind, pos: pos ?? fallback };
    if (!state.deck.guides) state.deck.guides = [];
    state.deck.guides.push(next);
    state.deck.modifiedAt = new Date().toISOString();
  });
  return id;
}

export function moveUserGuide(id: string, pos: number): void {
  useDeckStore.setState((state) => {
    if (!state.deck?.guides) return;
    const g = state.deck.guides.find((x) => x.id === id);
    if (!g) return;
    g.pos = pos;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function removeUserGuide(id: string): void {
  useDeckStore.setState((state) => {
    if (!state.deck?.guides) return;
    state.deck.guides = state.deck.guides.filter((x) => x.id !== id);
    state.deck.modifiedAt = new Date().toISOString();
  });
}

export function clearUserGuides(): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    state.deck.guides = [];
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Разбивка по осям — формат, который ожидает computeSnap(userGuides).
export function guidesByAxis(guides: UserGuide[]): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (const g of guides) {
    if (g.kind === 'v') v.push(g.pos);
    else h.push(g.pos);
  }
  return { v, h };
}
