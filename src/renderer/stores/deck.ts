import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Deck } from '../lib/model/schema';

// Стор презентации (deck). На Phase 2 хранит текущую открытую модель;
// модификация — через actions, чтобы все мутации шли через immer и могли
// быть перехвачены undo-стеком (пункт 2.23).

interface DeckState {
  deck: Deck | null;
  // Загрузить готовый deck (например, после File → New или Open).
  setDeck: (deck: Deck) => void;
  // Сбросить (закрыть документ).
  reset: () => void;
}

export const useDeckStore = create<DeckState>()(
  immer((set) => ({
    deck: null,
    setDeck: (deck) =>
      set((state) => {
        state.deck = deck;
      }),
    reset: () =>
      set((state) => {
        state.deck = null;
      }),
  })),
);
