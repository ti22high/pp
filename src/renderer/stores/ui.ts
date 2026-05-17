import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SlideId } from '@shared/types';

// UI-стор: zoom стейджа, активный слайд, видимость панелей и переключатели View.
// Не имеет отношения к данным документа — переживёт open/close файла.

interface UiState {
  activeSlideId: SlideId | null;
  zoom: number; // множитель масштаба стейджа, 1.0 = 100 %.
  stagePan: { x: number; y: number }; // смещение стейджа (Space+drag в 2.5)
  showRuler: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  showFilmstrip: boolean;
  showInspector: boolean;
  setActiveSlide: (id: SlideId | null) => void;
  setZoom: (zoom: number) => void;
  setStagePan: (pan: { x: number; y: number }) => void;
  toggleRuler: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleFilmstrip: () => void;
  toggleInspector: () => void;
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeSlideId: null,
    zoom: 1,
    stagePan: { x: 0, y: 0 },
    showRuler: true,
    showGrid: false,
    snapToGrid: false,
    showFilmstrip: true,
    showInspector: true,
    setActiveSlide: (id) =>
      set((s) => {
        s.activeSlideId = id;
      }),
    setZoom: (zoom) =>
      set((s) => {
        s.zoom = Math.max(0.1, Math.min(8, zoom));
      }),
    setStagePan: (pan) =>
      set((s) => {
        s.stagePan = pan;
      }),
    toggleRuler: () =>
      set((s) => {
        s.showRuler = !s.showRuler;
      }),
    toggleGrid: () =>
      set((s) => {
        s.showGrid = !s.showGrid;
      }),
    toggleSnapToGrid: () =>
      set((s) => {
        s.snapToGrid = !s.snapToGrid;
      }),
    toggleFilmstrip: () =>
      set((s) => {
        s.showFilmstrip = !s.showFilmstrip;
      }),
    toggleInspector: () =>
      set((s) => {
        s.showInspector = !s.showInspector;
      }),
  })),
);
