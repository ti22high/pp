// Операции с самими слайдами (создание, дубль, удаление, hide).
// Используются меню «Слайд» и filmstrip-контекстом.

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { createEmptySlide, cloneSlide } from '@renderer/lib/model/factory';

export function newSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  let createdId: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = createEmptySlide();
    createdId = slide.id;
    state.deck.slides[slide.id] = slide;
    if (activeId) {
      const idx = state.deck.slideOrder.indexOf(activeId);
      // Вставляем сразу ПОСЛЕ активного.
      state.deck.slideOrder.splice(idx + 1, 0, slide.id);
    } else {
      state.deck.slideOrder.push(slide.id);
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
  if (createdId) {
    useUiStore.getState().setActiveSlide(createdId);
    useSelectionStore.getState().clear();
  }
}

export function duplicateSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  let createdId: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const src = state.deck.slides[activeId];
    if (!src) return;
    const copy = cloneSlide(src);
    createdId = copy.id;
    state.deck.slides[copy.id] = copy;
    const idx = state.deck.slideOrder.indexOf(activeId);
    state.deck.slideOrder.splice(idx + 1, 0, copy.id);
    state.deck.modifiedAt = new Date().toISOString();
  });
  if (createdId) {
    useUiStore.getState().setActiveSlide(createdId);
    useSelectionStore.getState().clear();
  }
}

export function deleteSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  let nextActive: string | null = null;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const order = state.deck.slideOrder;
    const idx = order.indexOf(activeId);
    if (idx < 0) return;
    // Не даём удалить последний слайд — заменим его на пустой, чтобы
    // в деке всегда был хотя бы один.
    if (order.length === 1) {
      const fresh = createEmptySlide();
      delete state.deck.slides[activeId];
      state.deck.slides[fresh.id] = fresh;
      state.deck.slideOrder = [fresh.id];
      nextActive = fresh.id;
    } else {
      order.splice(idx, 1);
      delete state.deck.slides[activeId];
      // Следующий активный — сосед справа (если был); иначе слева.
      nextActive = order[idx] ?? order[idx - 1] ?? null;
    }
    state.deck.modifiedAt = new Date().toISOString();
  });
  useUiStore.getState().setActiveSlide(nextActive);
  useSelectionStore.getState().clear();
}

export function toggleHiddenSlide(): void {
  const activeId = useUiStore.getState().activeSlideId;
  if (!activeId) return;
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[activeId];
    if (!slide) return;
    slide.hidden = !slide.hidden;
    state.deck.modifiedAt = new Date().toISOString();
  });
}
