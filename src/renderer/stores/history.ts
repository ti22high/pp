import { create } from 'zustand';
import type { Patch } from 'immer';

// Стор undo/redo. Хранит только метаданные стека — фактические Immer-патчи
// (forward + inverse) применяются к deckStore. Реализация commit/undo/redo
// появится в пункте 2.23 (src/renderer/lib/undo.ts).

export interface HistoryEntry {
  patches: Patch[];
  inverse: Patch[];
  ts: number;
  kind: string;
  targetId?: string;
}

interface HistoryState {
  stack: HistoryEntry[];
  pointer: number; // -1 = пустой стек
  setStack: (stack: HistoryEntry[], pointer: number) => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  stack: [],
  pointer: -1,
  setStack: (stack, pointer) => set({ stack, pointer }),
  reset: () => set({ stack: [], pointer: -1 }),
}));
