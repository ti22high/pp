import { describe, it, expect } from 'vitest';
import { listBookmarks } from '../../src/renderer/lib/bookmarks';
import { createEmptyDeck, createRect } from '../../src/renderer/lib/model/factory';

describe('listBookmarks', () => {
  it('возвращает [] для пустой/отсутствующей деки', () => {
    expect(listBookmarks(null)).toEqual([]);
    expect(listBookmarks(createEmptyDeck())).toEqual([]);
  });

  it('собирает закладки в порядке слайдов с индексом слайда', () => {
    const deck = createEmptyDeck();
    const s0 = deck.slideOrder[0];
    const withMark = createRect(0, 0);
    withMark.bookmark = 'Итоги';
    const plain = createRect(0, 0); // без закладки — не попадает
    deck.slides[s0].shapes.push(withMark, plain);

    const list = listBookmarks(deck);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: withMark.id, name: 'Итоги', slideIndex: 0, slideId: s0 });
  });
});
