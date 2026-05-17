import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ShapeId } from '@shared/types';

// Стор выделения фигур на текущем слайде.
// Может быть multi-select (Shift+click и rubber band — 2.15).

interface SelectionState {
  selectedShapeIds: ShapeId[];
  select: (ids: ShapeId[]) => void;
  toggle: (id: ShapeId) => void;
  addToSelection: (id: ShapeId) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>()(
  immer((set) => ({
    selectedShapeIds: [],
    select: (ids) =>
      set((s) => {
        s.selectedShapeIds = [...ids];
      }),
    toggle: (id) =>
      set((s) => {
        const idx = s.selectedShapeIds.indexOf(id);
        if (idx >= 0) s.selectedShapeIds.splice(idx, 1);
        else s.selectedShapeIds.push(id);
      }),
    addToSelection: (id) =>
      set((s) => {
        if (!s.selectedShapeIds.includes(id)) s.selectedShapeIds.push(id);
      }),
    clear: () =>
      set((s) => {
        s.selectedShapeIds = [];
      }),
  })),
);
