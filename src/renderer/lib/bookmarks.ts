import type { Deck } from '@renderer/lib/model/schema';

// Ссылка на закладку: id фигуры-якоря (= bookmarkId в hyperlink), её имя и
// слайд, на котором она лежит. Phase 3.22.
export interface BookmarkRef {
  id: string;
  name: string;
  slideId: string;
  slideIndex: number;
}

// Собирает все закладки деки в порядке слайдов (для выбора в hyperlink-диалоге).
export function listBookmarks(deck: Deck | null | undefined): BookmarkRef[] {
  if (!deck) return [];
  const out: BookmarkRef[] = [];
  deck.slideOrder.forEach((slideId, slideIndex) => {
    const slide = deck.slides[slideId];
    if (!slide) return;
    for (const sh of slide.shapes) {
      if (sh.bookmark) {
        out.push({ id: sh.id, name: sh.bookmark, slideId, slideIndex });
      }
    }
  });
  return out;
}
