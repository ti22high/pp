import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Deck } from '../../src/renderer/lib/model/schema';

// undo.ts держит модульный синглтон history + одну подписку на deck-стор.
// Чтобы тесты были независимы, на каждый прогон берём свежие модули.
async function freshModules() {
  vi.resetModules();
  const deckMod = await import('../../src/renderer/stores/deck');
  const undoMod = await import('../../src/renderer/lib/undo');
  const factory = await import('../../src/renderer/lib/model/factory');
  return { ...deckMod, ...undoMod, ...factory };
}

let m: Awaited<ReturnType<typeof freshModules>>;

beforeEach(async () => {
  m = await freshModules();
});

function setTitle(deck: Deck, title: string): Deck {
  // Новый объект-дек (snapshot-подход сравнивает по ссылке).
  return { ...deck, title, modifiedAt: new Date().toISOString() };
}

describe('undo / redo', () => {
  it('restores the previous deck and reapplies on redo', () => {
    const deck = m.createEmptyDeck('one');
    m.useDeckStore.getState().setDeck(deck);
    m.initHistory();

    m.useDeckStore.getState().setDeck(setTitle(deck, 'two'));
    expect(m.useDeckStore.getState().deck?.title).toBe('two');

    m.undo();
    expect(m.useDeckStore.getState().deck?.title).toBe('one');

    m.redo();
    expect(m.useDeckStore.getState().deck?.title).toBe('two');
  });

  it('does nothing when there is no history', () => {
    const deck = m.createEmptyDeck('only');
    m.useDeckStore.getState().setDeck(deck);
    m.initHistory();
    m.undo();
    expect(m.useDeckStore.getState().deck?.title).toBe('only');
    expect(m.canUndo()).toBe(false);
  });

  it('tracks canUndo / canRedo flags', () => {
    const deck = m.createEmptyDeck('a');
    m.useDeckStore.getState().setDeck(deck);
    m.initHistory();
    expect(m.canUndo()).toBe(false);

    m.useDeckStore.getState().setDeck(setTitle(deck, 'b'));
    m.undo();
    expect(m.canRedo()).toBe(true);
    expect(m.canUndo()).toBe(false);
  });
});
